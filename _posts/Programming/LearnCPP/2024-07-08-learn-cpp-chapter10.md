---
title: Chapter 10 Type Conversion, Type Aliases, and Type Deduction
date: 2024-07-08 10:22 +0800
categories: [Programming, Learn C++]
tags: [C++]
---

### 10.1 Implicit type conversion

#### 10.1.1 Introduction to type conversion

对象的值以连续比特的形式存储，这些连续的比特会由对象的数据类型告诉编译器要如何解释为有意义的数值。不同的数据类型可能会表示相同的值，比方说，整数值`3`可能会被存储为`0000 0000 0000 0000 0000 0000 0000 0011`，而浮点数3.0则可能会被存储为`0100 0000 0100 0000 0000 0000 0000 0000`

所以，如果我们编译下面这行代码，会发生什么？

```c++
float f { 3 };
```

编译器不能直接把代表`int`值`3`的bit拷贝到为`float`类型`f`而分配的内存中。实际上，编译器需要将整数值`3`转换为同等的、可以被存储到为`f`分配的内存中的浮点数值`3.0`。

我们将从一个不同类型的数值中创建一个新的特定类型的数值的过程称为**转换conversion**

> 转换不会改变被转换的值或类型。相反，转换的结果是创建一个具有所需类型的新值。
{: .prompt-info}

类型转换可以通过两种方式触发，分别是显式和隐式。我们先来了解隐式类型转换

#### 10.1.2 Implicit type conversion

隐式类型转换又被称为自动类型转换。当我们需要一种特定类型的值，却被提供了另一种类型的值时，编译器会自动执行隐式类型转换。C++中的绝大多数类型转换都是隐式的。我们来看一些例子：

初始化或赋值

```c++
double d {3}; // int -> double
d = 6; // int -> double
```

函数返回值


```c++
float doSometing()
{
	return 3.0; // double -> float
}
```

二元操作符

```c++
double division {4.0 / 3} // int value 3 -> double
```

if语句中的非布尔值

```c++
if(5) {} // int -> bool
```

形参与实参

```c++
void doSomething(long l) {}

doSomething(3); // int -> long
```

#### 10.1.3 What happens when a type conversion is invoked

当类型转换被触发时，编译器会判断是否可以从当前值的类型转换为所需类型。如果可以，则编译器会创建所需类型的值。如果编译器无法找到可行的转换，则编译器会fail并报错。类型转换失败的原因有很多。比如说，编译器不知道如何在原始类型和所需类型之间完成值的转换：

```c++
int x {3.5}; // brace-intialization不允许会导致数据丢失的转换
```

也有可能编译器会无法确定哪种可能的类型转换是明确的最佳选择，我们会在[**这篇博客**](https://lovewithyou.tech/posts/chapter11/#113-function-overload-resolution-and-ambiguous-matches)中深入讨论。

所以，编译器实际上是如何确定它是否可以将一个值从一种类型转换到另一种类型的呢？

#### 10.1.4 The standard conversions

C++标准定义了在基础类型（在某些情况下，也包含复合类型）之间是如何转换的，这些转换规则被称为**标准转换standard conversions**

标准转换可以大致分为四种类型，每种类型涵盖了不同类型的转换：

- **数值提升 numeric promotions**
- **数值转换 numeric conversions**
- **算数转换 arithmetic conversions**
- **其他转换 other conversions**

---

### 10.2 Floating-point and integral promotion

在之前的章节中（实际上我没写），我们提到过C++对于每个数值类型有一个最小size的保证，但这些类型的实际大小会因编译器与架构而异。

这种可变性使得`int`与`double`数据类型的大小可以被设置为在给定架构上的最大化性能所对应的大小。例如，32位架构的加算计可以一次性处理32bit大小的数据，这种情况下，`int`就可能会被设置为32bit的宽度，因为这是CPU所操作的数据的“自然”大小，也应该是性能最高的。

但是，如果我们想要32位的CPU去处理一个8-bit的数值（如`char`）或者一个16-bit的数值呢？一些32位的处理器是可以直接操作这样的数值的，但结果是会比操作32-bit的数值的速度慢很多。也有一些32位的处理器只能操作32-bit的数值，那么这样的处理器会要求由额外的步骤来处理这些较“窄”的值。

#### 10.2.1 Numeric promotion

由于C++被设计为在各种架构上具有可移植性与高性能，所以C++在设计上不想假设给定的CPU能够有效地处理比该CPU的自然数据大小更窄的值。

为了解决这个问题，C++定义了一类被称为**numeric promotions**的类型转换。数值提升是将某些较窄的数据类型（例如`char`）转换为某些较宽的、可以被CPU高效处理的数据类型（如`int`或`double`）。

> 数值提升的主要目的是为了是较小的类型在运算时能够使用到处理器更高效的指令集。
{: .prompt-tip}

所有的数值提升都是**value-preserving**的，也就是说，通过转换而创建的新值与原来的值永远相等。由于源类型的全部值都可以被精准地表示在目标类型中，因此值保留类型的转换都会被视为安全转换。

#### 10.2.2 Numeric promotion reduces redundancy

我们考虑下面这个函数：

```c++
#include <iostream>

void printInt(int x)
{
	std::cout << x << '\n';
}
```

这个函数会接受一个int作为参数并输出。然而如果我们也想输出一个`short`或`char`呢？由于数值提升的存在，我们无需重新定义输出short或char的函数，只要我们给出的实参的数值可以通过数值提升而转换到形参的数据类型，我们都可以直接调用，从而避免了重复定义函数。

#### 10.2.3 Numeric promotion categories

数值提升的规则又可以分细分为两类：**integral提升**与**floating point提升**。

#### 10.2.4 Floating point promotions

浮点数提升相对简单。通过浮点数提升，我们可以将`float`值转换为`double`，也就是说，我们可以实现一个形参为`double`的函数，在调用时传递一个`double`或`float`的实参：

```c++
#include <iostream>

void printDouble(double d)
{
    std::cout << d << '\n';
}

int main()
{
    printDouble(3.0);  // no conversion necessary
    printDouble(4.5f); // numeric promotion of float to double
}
```

#### 10.2.5 Integral promotions

整数提升会相对复杂一些。通过integral promotions，我们可以实现以下转换：

- `signed char`或`signed short`转换为`int`
- `unsigned char`、`char8_t`、`unsigned short`转换为`int`（如果不会溢出）或`unsigned int`
- `bool`转换为`int`

大多数情况下，我们可以实现一个形参为int的函数，然后使用其他各种整数类型调用该函数：

```c++
#include <iostream>

void printInt(int x)
{
	std::cout << x << '\n';
}

int main()
{
    short s{3};
    
    printInt(2);
    printInt(s);
    printInt('a');
    printInt(true);
}
```

#### 10.2.6 Not all widening conversion are numeric promotions

有一些拓展数值位宽的转换并非数值提升，比如`char`到`short`，`int`到`long`，它们实际上属于数值转换，我们的判断依据是这些转换不一定有助于将较小的类型转换为处理器可以更有效处理的较大类型。

---

### 10.3 Numeric conversions

数值转换主要有五种基本类型：

1. 从一种整数类型转换到其他整数类型（不包括整数提升）

   ```c++
   short s = 3; // int -> short
   long l = 3; // int -> long
   char ch = s; // short -> char
   unsigned int u = 3; // int -> unsigned int
   ```

2. 从一种浮点类型转换到其他浮点类型（不包括浮点提升）

   ```c++
   float f = 3.0; // double -> float
   long double ld = 3.0; // double -> long double
   ```

3. 从一种浮点类型转换到任意整数类型

   ```c++
   int i = 3.5; // double to int
   ```

4. 从一种整数类型转换到任意浮点类型

   ```c++
   double d = 3; // int to double
   ```

5. 从一种整数类型或浮点类型转换到布尔类型

   ```c++
   bool b1 = 3; // int -> bool
   bool b2 = 3.0; // double -> bool
   ```

需要注意的是，由于使用大括号进行的初始化严格禁止某些类型的数值转换，所以我们所使用的例子都是复制初始化。关于大括号初始化的更多细节我们很快就会了解到。

#### 10.3.1 Safe and potentially unsafe conversions

我们前面提到过，数值提升是一种值保留的转换，是安全的。而某些数值转换在某些情况下属于非值保留的转换，我们将这些转换称为非安全的转换。

数值转换分为三个安全类别：

1. 值保留转换是安全的数值转换，其中目标类型可以精确地表示源类型中的全部数值，例如从`int`转换到`long`，或从`short`转换到`double`

   ```c++
   int main()
   {
   	int n {5};
   	short s {5};
   	
   	long l = n; // fine
   	double d = s; // fine
   }
   ```

   通过值保留转换创建的值始终可以转换为源类型，得到一个与原始值相等的值

   ```c++
   #include <iostream>
   
   int main()
   {
       int n = static_cast<int>(static_cast<long>(3));
       std::cout << n << '\n'; // prints 3
       
       char c = static_cast<char>(static_cast<double>('c'));
       std::cout << c << '\n'; // prints 'c'
   }
   ```

2. 重新解释reinterpret转换指的是在不改变二进制表示的情况下，将一个值转换为另一种类型。这种转换是潜在的不安全的数值转换，其中结果可能会超出源类型的数值范围。`signed`与`unsigned`之间的转换就属于这个类型，比如说从`signed int`转换到`unsigned int`：

   ```c++
   int main()
   {
       int n1 {5};
       int n2 {-5};
       
       unsigned int u1 {n1}; // fine, value will be preserved
       unsigned int u2 {n2}; // bad, value will be out of range of unsigned int 
   }
   ```

   通过重新解释转换的值可以被转换回源类型，从而得到与原来相等的值

   ```c++
   #include <iostream>
   
   int main()
   {
       // int -> unsigned int -> int
       int u = static_cast<int>(static_cast<unsigned int>(-5)); 
       std::cout << u << '\n'; // prints -5;
   }
   ```

3. lossy转换是潜在的不安全的数值转换，数据有可能在转换过程中有损失，比如从一个`double`类型转换到`int`类型，或着从`double`转换到`float`

   ```c++
   int i = 3.0; // fine
   int j = 3.5; // data loss: fractional value is lost
   ```

   将丢失数据的值转换到源类型会生成一个原有值不相等的值：

   ```cpp
   #include <iostream>
   
   int main()
   {
       double d {static_cast<double>(static_cast<int>(3.5))};
       std::cout << d << '\n'; // prints 3: data loss happens here
   }
   ```

#### 10.3.2 More on numeric conversions

数值转换存在一些特定的规则，在开发过程中需要我们务必留意。

1. 在所有情况下，将一个值转换为其范围不支持的类型都会导致不可预测的结果，例如：

   ```c++
   int main()
   {
   	int i {30000};
   	char c = i; // char's range is -128 to 127
   	
   	std::cout << static_cast<int>(c) << '\n'; // prints 48
   }
   ```

   我们需要记住：对于unsigned值来说，溢出是有明确定义的，而对于signed值来说，溢出将会导致未定义的行为。

2. 从较大的整数类型或浮点数类型转换到同一系列中的较小类型通常会起作用，只要该值在较小类型的范围内，例如：

   ```c++
   int i {2};
   short s = i; // fine
   
   double d {0.1234};
   float f = d; // fine
   ```

3. 对于浮点值来说，由于较小类型中的精度的损失，可能会发生四舍五入，例如：

   ```c++
   float f = 0.123456789;  // double value 0.123456789 has 9 significant digits, but float can only support about 7
   std::cout << std::setprecision(9) << f << '\n'; 
   ```

   在这个例子中，我们会得到一个精度有损失的值，因为`float`的精度要低于`double`

4. 将一个整数值转换为浮点数通常有效，只要值在浮点数类型的范围内：

   ```cpp
   int i{10};
   float f = i; // fine
   ```

5. 从浮点数转换到整数值也是可行的，只要值在整数类型范围内，但分数部分会丢失，例如：

   ```cpp
   int i = 3.5;
   std::cout << i << '\n';
   ```

---

### 10.4 Narrowing conversions, list initailization, and constexpr intializers

在上一小节中，我们介绍了数值转换，它涵盖了基本类型之间各种不同的类型转换。

#### 10.4.1 Narrowing conversions

在C++中，narrowing conversions是一种潜在不安全的数值转换，其中目标类型可能无法容纳源类型的所有值。我们将下列转换都定义为narrowing：

- **浮点数类型转换到整数类型**
- **从浮点型到较窄或等级较低的浮点型的转换**，除非被转换的值是常量表达式（`constexpr`）且在目标类型的范围内（即使目标类型没有精度来存储数值的所有有效数字）。
- **从整型到浮点型的转换**，除非被转换的值是常量表达式`constexpr`并且该值可以精确地存储在目标类型中。
- **从一种整型到另一种不能代表原始类型所有值的整型的转换**，除非被转换的值是常量表达式`constexpr`并且该值可以精确地存储在目标类型中。这包括更宽到更窄的整型转换，以及整型符号转换（有符号到无符号或反之亦然）。

大多数情况下，使用缩窄转换会导致编译器警告。我们在开发中应该尽可能避免使用这种转换，从而保证代码的安全性与稳定性。

#### 10.4.2 Make intentional narrowing conversions explicit

我们不能避免掉所有的缩窄转换，尤其是在函数调用时，可能会有实参与形参不匹配的情况，需要使用到缩窄转换。

这种情况下，我们最好使用`static_cast`来将隐式的缩窄转换变为显式的缩窄变换，从而表示这是开发者有意进行的转换，同时避免编译器警告。比方说：

```c++
void someFunction(int i) {}

int main()
{
    double d {5.0};
    someFunction(d); // bad: implicit narrowing coversion will cause compiler warning
    somFunction(static_cast<int>(d)); // fine: explicit narrowing conversion
}
```

#### 10.4.3 Brace initialization disallows narrowing conversions

使用大括号进行初始化的话，如果存在缩窄转换，则会导致编译器报错。这也是为什么我们推荐使用大括号初始化的原因之一。例如：

```c++
int main()
{
	int i {3.5}; // this will not compile
}
```

如果一定要在大括号初始化中使用缩窄变换，务必使用`static_cast`：

```c++
int main()
{
	int i {static_cast<int>(3.5)}; // fine
}
```

#### 10.4.4 Some constexpr conversions aren't considered narrowing

当缩窄转换的源值在runtime之前未知时，那么对编译器来说，转换结果也只有在runtime时才可以得知。这种情况下，缩窄转换能够保留源值也无法在runtime之前确定。例如：

```c++
#include <iostream>

void print(unsigned int u)
{
    std::cout << u << '\n';
}

int main()
{
    std::cout << "Enter an integral value: ";
    int n {};
    std::cin >> n; // enter 5 or -5
    print(n); // so the conversion to unsigned int may or may not perserve value
}
```

然而，当缩窄类型的源值是constexpr时，编译器必须知道要转换的特定值。这种情况下，编译器可以自行完成转换，然后检查源值是否可以得到保留。若源值未被保留，则编译器会终止编译并报错。否则，该转换不会被视为缩窄转换。例如：

```cpp
int main()
{
    constexpr int n1 {5};
    unsigned int u1 {n1}; // fine, and conversion is not narrowing
   	
    constexpr int n2 {-5}; // note: constexpr
    unsigned int u2 {n2};  // compile error: conversion is narrowing
}
```

### 10.5 Arithmetic conversions

我们来考虑下面这个表达式：

```c++
int x {2 + 3};
```

当二元操作符`+`被调用是，两个加数都是`int`类型，那么表达式的返回结果自然是`int`。

但如果两个加数的类型不一样呢，比如说下面这个例子：

```c++
??? y {2 + 3.5}
```

在C++中，某些运算符要求它们的运算数属于同一种数据类型。如果我们试图调用一个运算数类型不同的运算符时，其中一个或全部两个运算数都会被隐式地匹配到特定的数据类型中，具体则需要遵守常规算数转换的规则。

#### 10.5.1 The operators that require operands of the same type

下列运算符的运算数需要类型相同：

- 二元算数运算符：+ - * / %
- 二元关系运算符： < > <= >= == !=
- 二元位算数运算符：& ^ |
- 条件运算符：?:

#### 10.5.2 The usual arithmetic conversion rules

通用算数转换的规则有些复杂，所以我们稍微简化一下。编译器有一个类型的排名列表，如下列所示：

- `long long double` (highest rank)
- `double`
- `float` 
- `long long`
- `long`
- `int` (lowest rank)

当查找一个匹配类型时，需要应用下列规则：

- 如果两个运算数分别是整数类型与浮点数类型，则整数类型会转换到浮点数类型（此处不发生数值提升）
- 否则，两个整数运算数都会得到数值提升
  - 如果其中一个是`signed`而另一个是`unsigned`的，则我们采用特殊规则
  - 否则，排名较低的类型会被转换到排名相对较高的类型

我们来看看当两个整数类型的运算数一个为正一个为负时需要用的特殊规则：

- 如果`unsigned`运算数的排名更高，则`signed`运算数会转换到`unsigned`运算数所使用的类型
- 如果`signed`运算数的类型可以表示`unsigned`运算数类型的全部值，则`unsigned`运算数转换到`signed`运算数的类型
- 否则两个运算数都会转换到`signed`运算数类型所对应`unsigned`类型

完整的规则我们可以在[**这里**](https://en.cppreference.com/w/cpp/language/usual_arithmetic_conversions)找到

#### 10.5.3 Some examples

 我们以`+`为示例，并使用typeid运算符来显示表达式返回的数据类型。

首先，我们让`int`与`double`相加：

```c++
#include <iostream>
#include <typeinfo>

int main()
{
    int i {2};
    double d {3.5};
    std::cout << typeid(i + d).name() << ' ' << i + d << '\n';
}
```

输出的结果是：`double 5.5`

我们再来两个short相加所返回的类型：

```c++
#include <iostream>
#include <typeinfo>

int main()
{
    short a {4};
    short b {5};
    std::cout << typeid(a + b).name() << ' ' << a + b << '\n';
}
```

输出的结果是 `int 9`。我们可以尝试分析这里的逻辑，因为两个运算数的排名先后一致，所以都会通过数值提升到`int`类型

### 10.6 explicit type conversion (cast) and static_cast

我们之前提到过，编译器通过一种被称为隐式类型转换的系统，隐式地将数值从一种类型转换到另一种类型。当我么想要通过数值提升将一个数据类型转换到一种位宽更高的类型时，使用隐式类型转换是没问题的。

现在，我们来考虑这样一个例子。首先，我们写一行这样的代码

```c++
double d = 10 / 4; // does integer division, initializes d with value 2.0
```

在这行代码中，因为`10`和`4`都是`int`类型，所以这里执行的是整数除法，并且表达式得到的结果是`2`。然后这个值会通过数值转换到`double`类型，也就是`2.0`，最后再赋值给`d`

而当我们将任意一个或两个整数类型的运算符换位double类型后，都会发生浮点数除法：

```c++
double d = 10.0 / 4.0; // does floating point division, initializes d with value 2.5
```

这样的结果是我们想要的。但如果我们使用的是变量而不是文本值呢？例如：

```cpp
int x {10};
int y {4};
double d = x / y; // does integer division, initializes d with value 2.0
```

这里所发生的与第一个例子是一样的。显然在程序中，使用变量的情况更多，那我们应该如何告诉编译器，我们想要使用的是浮点数除法，而非整数除法呢？显然，我们需要某种方法，将一个或两个变量运算数转换为浮点数值，这样自然会执行浮点数除法。

C++为我们提供了很多**cast**运算符，可以用于请求编译器执行类型转换，这种转换也被称为显式类型转换。

#### 10.6.1 Type casting

C++支持五种不同的cast类型，分别是`C-style casts`、`static casts`、`const casts`、`dynamic  casts`以及`reinterpret casts`。后四种也会被称为**named  casts**。

在本小节中，我们想来讨论`C-style casts`和`static casts`，而`const casts`和`reinterpret casts`应该尽量避免使用，因为它们只在很少见的情况下有助于程序开发。

#### 10.6.2 C-style casts

在C语言编程中，casts通过`()`运算符实现，下面是一个例子：

```c++
#include <iostream>

int main()
{
	int x {10};
    int y {4};
    
    double d {(double) x / y};
    std::cout << d << '\n'; // prints 2.5
}
```

 在上面这段代码中，我们通过`C-style casts`来告诉编译器将`x`的类型转换为`double`。

当然，在C++中我们也可以使用一种类似于函数调用的语法，例如：

```cpp
double d {double(x) / y};
```

虽然`C-style casts`看起来是一个单一类型的cast，但实际上它可以根据上下文执行很多种类的转换，其中就包括`static casts`、`const casts`、以及`reinterpret casts`（后者是我们不推荐使用的两种casts）。所以，`C-style casts`存在被错误使用的风险，在C++中程序中，我们同样要尽量避免使用`C-style casts`

同时`C-style casts`也会降低代码的可读性。

我们可以在[**这篇文章**](https://anteru.net/blog/2007/c-background-static-reinterpret-and-c-style-casts/)中了解`C-style casts`实际的运行原理与机制，这里就不做更多讨论了。

#### 10.6.3 static_cast

`static_cast`的主要优势在于，它可以提供compile-time的类型检查，从而有助于避免意外的错误。比如说，C语言类型的字符串不能被转换为`int`类型，所以下面这个语句中`static_cast`会直接让编译器报错，有助于我们修改错误：

```c++
int x {static_cast<int>("Hello")}; // invalid: will produce compilation error
```

`static_cast`也被有意设计为不如`C-style casts`那么“强大”，所以使用`static_cast`可以帮助我们避免无意中移除const等类似的操作，如

```c++
int main()
{
    const int x{5};
    int& ref {static_cast<int&>(x)}; // invalid: will produce compilation error
    ref  = 6;
}
```

#### 10.6.4 Using static_cast to make narrowing conversions explicit

当一个潜在不安全（缩窄）隐式类型转换发生时，编译器会经常弹出警告信息。比方说：

```cassandra
int i {48};
char ch = i; // implicit narrowing conversion
```

而如果我们使用列表初始化，则会导致编译器报错：“conversions from 'int' to 'char' requires a narrowing conversion”

所以为了解决这个问题，我们可以使用`static_cast`，从而明确地告诉编译器此转换是预期的，并且我们接受可能的后果。由于`static_cast`的输出类型是char，所以变量`ch`的初始化不会产生任何类型不匹配，因此也不会出现任何警告或报错：

```c++
int i{ 48 };
char ch = {static_cast<char>(i)}; // fine
```

我们也可以再看一个例子：

```c++
int i {100};
i = i / 2.5;
```

这里，编译器会给出将double类型转换为int类型而可能导致数据丢失，所以我们可以使用`static_cast`来显式地告知编译器我们的目的：

```c++
int i {100};
i = static_cast<int>(i / 2.5);
```

### 10.7 Typedefs and type aliases

#### 10.7.1 Type aliases

在C++中，`using`是一个用于为现有数据类型创建别名的关键字，用法我们可以参考下面这个语句：

```c++
using Distance = double; // defines Distance as an alias for type double
```

一旦完成别名的定义，我们就可以像使用源类型一样使用它的别名，例如：

```c++
Distance milesToDowntown {3.4};
```

#### 10.7.2 Naming type aliases

关于类型别名的命名，有三种常见的约定：

- 以"_t"作为后缀，比如`size_t`，`nullptr_t`。这是从C语言中继承的约定，在现代C++中这种约定的用法已经没有那么普遍了。
- 以“_type”作为 后缀，，有些标准库类型就遵循了这种约定，比如`std::string::size_type`。但也有很多内嵌的类型别名没有使用这种约定，例如`std::string::iterator`，所以这种约定也不是最好的。
- 不使用任何后缀。在现代C++中，我们通常会将类型别名的首字母大写，用于区分。

#### 10.7.3 Type aliases are not distinct types

我们需要注意，类型别名并非引入一个新的、不同的类型，它只是为源类型添加了一个标识符。类型别名与源类型之间完全可以随意互换。

#### 10.7.4 The scope of a type alias

类型别名的scope与变量标识符所遵循的规则一样。当类型别名被定义在大括号内，则对应的scope也会被限制在大括号内。

如果我们需要在多个文件中中使用一个或多个类型别名，则我们可以在头文件中定义类型别名，并使用`#include`在对应的文件中进行使用：

```c++
#ifndef MYTYPES_H
#define MYTYPES_H

    using Miles = long;
    using Speed = long;

#endif
```
{: file="mytypes.h"}

这样的话，类型别名会被引入到全局命名空间中，从而获得global scope。

#### 10.7.4 Typedefs

`typedef`是另一种老旧的创建类型别名的方式，用法如下：

```c++
// the following aliases are the same
typedef long Miles;
using Milse = long;
```

出于兼容性的考量，`typedef`在C++中得到了保留。但是在用法上已经大规模被`using`取代，并且`typedef`有一些语法上的问题。

首先对于新手来说，容易颠倒源类型与类型别名的顺序，如：

```c++
typedef Distance double; // incorrect (typedef name first)
typedef double Distance; // correct (aliased type name first)
```

其次是，当涉及到复杂类型时，`typedef`可能会降低代码的可读性，例如：

```c++
typedef int (*FcnType)(double, char); // FcnType hard to find
using FcnType = int(*)(double, char); // FcnType easier to find
```

#### 10.7.5 When should we use type aliases

1. **using type aliases for platform independent coding**

   使用类型别名最主要的作用是隐藏平台相关的细节信息。在某些平台，`int`可能是两个字节，而有些平台上则可能是四个字节。这样的话，在写与平台无关的代码时，使用int去存储大于两个字节的信息就有潜在性的风险。

   因为char、short、int、long不能直接看出它们的size，所以对于跨平台程序，通常会使用类型别名来表示出它们的位宽，例如`int8_t`表示8-bit的有符号整数值。

   为了保证每个类型别名解析为正确大小的类型，我们通常会与预处理器配合使用：

   ```c++
   #ifdef INT_2_BYTES
   using int8_t = char;
   using int16_t = int;
   using int32_t = long;
   #else
   using int8_t = char;
   using int16_t = short;
   using int32_t = int;
   #endif
   ```

2. **using type aliases to make complex types easier to read**

   在高阶C++中，我们会使用到一些复杂的类型，并且会影响编写代码的效率和代码的可读性。下面是一个例子：

   ```c++
   #include <string> // for std::string
   #include <vector> // for std::vector
   #include <utility> // for std::pair
   
   bool hasDuplicates(std::vector<std::pair<std::string, int>> pairlist)
   {
       // some code here
       return false;
   }
   
   int main()
   {
        std::vector<std::pair<std::string, int>> pairlist;
   }
   ```

   在上面这段代码中，我们可以为类型`std::vector<std::pair<std::string, int>>`创建一个类型别名：

   ```c++
   #include <string> // for std::string
   #include <vector> // for std::vector
   #include <utility> // for std::pair
   
   using VectPairSI = std::vector<std::pair<std::string, int>>; // make VectPairSI an alias for this crazy type
   
   bool hasDuplicates(VectPairSI pairlist) // use VectPairSI in a function parameter
   {
       // some code here
       return false;
   }
   
   int main()
   {
        VectPairSI pairlist; // instantiate a VectPairSI variable
   
        return 0;
   }
   ```

3. **using type aliases to document the meaning of a value**

   使用类型别名可以让变量更易理解，提高代码可读性。我们来考虑下面这个例子：

   ```c++
   int gradeTest();
   ```

   在这个语句中，我们只知道函数`gradeTest()`返回的值类型是`int`，但是我们不清楚这个函数的返回值具体是什么含义。如果我们使用类型别名，那么函数的用途会很清晰：

   ```c++
   using TestScore = int;
   TestScore gradeTest();
   ```

4. **using type aliases for easier code maintenance**

   类型别名允许我们更改对象的底层类型，同时无需修改大量的hardcoded类型。

   我们考虑这样一个例子。我们在程序中使用short来保存学生的ID号码，但随着学生数量的扩大，我们需要使用long来保存。如果没有使用类型别名，我们需要梳理大量的代码，将short替换为long。我们可能很难弄清楚哪些类型为short的对象是用于保存学生ID号码的。

   然而，如果使用类型别名，就可以快速地修改类型，也就是将`using StudentID = short;`改为`using StudentID = long;`即可。

​	不过需要注意的是，通过类型别名修改类型后，我们仍需要对代码进行测试。

### 10.8 Type deduction for objects using the auto keyword

在C++中，我们需要为所有对象提供一个明确的类型。例如

```cpp
double d {5.0};
```

在这条语句中，我们确定变量`d`的类型是`double`。但实际上用于初始化变量`d`的文本值`5.0`已经有了一个明确的类型了，也就是`double`。也就是说，当我们希望变量已经用于初始化的值具有相同类型的情况下，我们实际上会提供两次相同的类型信息。

#### 10.8.1 Type deduction for initialized variables

类型推导type deduction是C++的一个特性，它允许编译器从对象的初始化中推导对象的类型。具体的用法如下：

```c++
int main()
{
    auto d{ 5.0 }; // 5.0 is a double literal, so d will be type double
    auto i{ 1 + 2 }; // 1 + 2 evaluates to an int, so i will be type int
    auto x { i }; // i is an int, so x will be type int too
    auto a { 1.23f }; // f suffix causes a to be deduced to float
    auto b { 5u };    // u suffix causes b to be deduced to unsigned int
}
```

由于函数调用也可以视为表达式，所以我们也通过使用auto来推导函数的返回类型，如：

```c++
int add(int x, int y)
{
    return x + y;
}

int main()
{
    auto sum { add(5, 6) }; // add() returns an int, so sum's type will be deduced to int
}
```

#### 10.8.2 Type deduction drops const / constexpr qualifiers

绝大多数情况下，类型推导会从推导类型中删除const或constexpr修饰符，例如：

```c++
int main()
{
	const int x {5}; // x has type const int
    auto y {x}; /// y will be type int (const is dropped)
}
```

在这里例子中，`x`的类型是`const int`，当我们使用类型推导来推导`y`的类型时，`y`的类型就变成了`int`。我们想要推导类型是const或者constexpr，则需要在auto关键字前加上对应的修饰符，例如：

```c++
int main()
{
    const int x { 5 };  // x has type const int (compile-time const)
    auto y { x };       // y will be type int (const is dropped)

    constexpr auto z { x }; // z will be type constexpr int (constexpr is reapplied)
}
```

#### 10.8.3 Type deduction for string literals

出于历史性的原因，C++中字符串文本值的类型比较特殊。我们看下面这个语句，编译器推导出的类型是 `const char*`，而非`std::string`：

```c++
auto s {"Hello world"}; // s will be type const char*, not std::string
```

如果我们想推导出来`std::string`或者`std::string_view`，则我们需要为字符串文本值添加`s`或`sv`后缀：

```c++
#include <string>
#include <string_view>

using namespace std::literals; // easiest way to access the s and sv suffixes

int main()
{
    // "goo"s is a std::string literal, so s1 will be deduced as a std::string
    auto s1 { "goo"s };  
    // "moo"sv is a std::string_view literal, so s2 will be deduced as a std::string_view
    auto s2 { "moo"sv };
}
```

只是在这种情况下，我们最好还是不要使用类型推导了。

#### 10.8.4 Concludes

- 当对象的类型无关紧要时，我们可以使用类型推导
- 当你需要一个与初始化值类型不同的变量时，或者程序的上下文使用显式类型更有益时，务必使用显式类型

### 10.9 Type deduction for functions

我们考虑下面这个程序：

```c++
int add(int x, int y)
{
	return x + y;
}
```

当函数被编译时，编译器会判断出`x + y`的结果是一个`int`值，然后确保函数声明的返回类型同样是`int`。

因为编译器已经可以从返回语句中推导出返回类型，所以在C++14中，`auto`关键字被拓展到了函数的返回类型推导上。用法可以参考如下：

```c++
auto add(int x, int y)
{
	return x + y;
}
```

虽然我们可以使用`auto`作为返回类型，函数中所有返回语句的返回类型需要保持一致。下面这段程序就无法通过编译：

```c++
auto someFunction(bool b)
{
	if(b)
		return 5;
    else
        return 6.5;
}
```

使用auto作为返回类型的函数的主要缺点是，这样的函数在使用前必须完全定义，仅仅有前向定义是不够的。例如下面这段程序就无法通过编译：

```c++
#include <iostream>

auto foo();

int main()
{
    std::cout << foo() << '\n'; // the compiler has only seen a forward declaration at this point
}

auto foo()
{
    return 5;
}
```

> 对于普通函数来说，我们应该优先使用显式的返回类型，而非返回类型推导
{: .prompt-info}

#### 10.9.1 Type deduction can’t be used for function parameter types

类型推导不适用于函数参数，并且在C++20之前，下面这个实例程序都是无法编译的：

```c++
#include <iostream>

void addAndPrint(auto x, auto y)
{
    std::cout << x + y << '\n';
}

int main()
{
    addAndPrint(2, 3); // case 1: call addAndPrint with int parameters
    addAndPrint(4.5, 6.7); // case 2: call addAndPrint with double parameters
}
```

在C++20中，auto关键字再次得到拓展，以便上述程序可以通过编译。但是，实际上auto在这里的用途并非类型推导，相反，它的作用是触发一个名为函数模板的机制。具体的我们后面再了解。 
