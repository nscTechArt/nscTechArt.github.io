---
layout: page
permalink: /blogs/Codes/LearnCPP/10-1/index.html
title: Type Conversion, Type Aliases, and Type Deduction
---

### **Type Conversion, Type Aliases, and Type Deduction**

---

#### 本章总结：

- 将值从一种数据类型转换为另一种数据类型的过程称为**Type conversion类型转换**。
- **Implicit type conversion隐式类型转换(**也被称为自动类型转换)在需要一种数据类型但是提供了另一种不同的数据类型时执行。如果编译器可以判断出如何进行两种类型之间的转换，就会进行隐式类型转换，否则就会出现编译错误。
- C++ 语言在基本类型之间定义了许多内置转换（以及一些更高级类型的转换），称为**standard conversions标准转换**。其中包括numeric promotions,、numeric conversions和arithmetic conversions。
- **numeric promotion**是将某些较小的数值类型转换为某些较大的数值类型（通常为 `int` 或 `double`），以便 CPU 可以对与处理器的自然数据大小匹配的数据进行操作。numeric promotion包括integral promotion和floating point promotion。numeric promotion是保值的，这意味着不会损失价值或精度。但并非所有扩大的转化都是promotion。
- **numeric conversion**是基本类型之间的类型转换，不是numeric promotion。**narrowing conversion**是可能导致值或精度损失的numeric conversion
- 在 C++ 中，某些二进制运算符要求其操作数为相同类型。如果提供了不同类型的操作数，则将使用一组称为**usual arithmetic conversions**的规则将一个或两个操作数隐式转换为匹配类型
- 当程序员通过强制转换显式请求转换时，将执行显式类型转换。强制转换表示程序员执行显式类型转换的请求。C++ 支持 5 种类型的强制转换：**C-style casts**、**static casts**、**const casts**、**dynamic casts**和**reinterpret casts**。通常，应避免使用 C-style casts、const casts并dynamic casts转换。**static_cast** 用于将值从一种类型转换为另一种类型的值，是迄今为止C++中最常用的强制转换
- **Typedef** 和**Type Alias**允许程序员为数据类型创建别名。这些别名不是新类型，其作用与别名类型相同。Typedef和Type Alias不提供任何类型的类型安全性，需要注意不要假定别名与别名类型不同
- **auto** 关键字有许多用途。首先，`auto` 可用于进行类型推导（也称为类型推断），这将从变量的初始值设定项中推断出变量的类型。类型演绎会删除常量和引用，因此如果需要，请务必将它们添加回来
- **auto**也可以用作函数返回类型，让编译器从函数的返回语句中推断出函数的返回类型，但对于普通函数应避免这样做。`auto`也可以用作**trailing return**语法的一部分。

---

#### 10.1 Implicit type conversion

对象的值存储为bits序列，对象的数据类型告诉编译器如何将这些bits解释为有意义的值。不同的数据类型可能以不同的方式表示“相同”的数字。例如，整数值 3 可能存储为二进制 0000 0000 0000 0000 0000 0000 0011，而浮点值 3.0 可能存储为二进制 0100 0000 0100 0000 0000 0000 0000 0000 0000 0000。

试想，下面这行代码会给我们什么结果：

```c++
float f{3}; // initialize floating point variable with int 3
```

这种情况下，编译器不能将表示整数值`3`的bits复制到为浮点数`f`分配的内存中。相反，编译器需要将整数数值`3`转换为等效的浮点数值`3.0`，然后才可以将其存储在分配给`f`的内存中

从一种类型的值生成另一种类型的新值的过程称为**conversion**转换。转换可以通过两种方式实现：一种是隐式转换(根据编译器的需求)，另一种是显式转换(当程序员请求时)。我们先来看隐式转换

---

当提供的数据类型与所需的数据类型不匹配时，编译器会自动执行隐式类型转换。C++中的绝大多数类型转换都是隐式的。以下所有情况中，都会采用隐式转换：

- 初始化或赋值不同类型的变量的值时：

  ```c++
  double d{3};  // int value 3 implicitly converted to type double
  d = 6; // int value 6 implicitly converted to type double
  ```

- 返回值的类型与函数声明的返回类型不一致时：

  ```c++
  float doSomething()
  {
  	return 3.0; // double会转换为float
  }
  ```

- 二元操作符的两个运算数类型不一致时：

  ```c++
  double divisiion{4.0 / 3}; //int类型的3会转换为double类型
  ```

- `if`语句中使用非布尔值时：

  ```c++
  if(5) //int类型的5会转换为bool类型
  {
  }
  ```

- 传递给函数的参数类型与函数参数类型不一致时：

  ```c++
  void doSomething(long l)
  {
  }
  
  doSomething(3); //int类型的3会转化为long类型
  ```

---

调用类型转换（无论是隐式还是显式）时，编译器将确定是否可以将值从当前类型转换为所需类型。如果可以找到有效的转换，则编译器将生成所需类型的新值。请注意，类型转换不会更改要转换的值或对象的值或类型。如果编译器找不到可接受的转换，则编译将失败并出现编译错误。类型转换可能由于多种原因而失败。例如，编译器可能不知道如何在原始类型和所需类型之间转换值。在其他情况下，语句可能不允许某些类型的转换。例如：

```c++
int x { 3.5 }; // brace-initialization disallows conversions that result in data loss
// 即使编译器知道如何将double值转换为 int 值，但在使用大括号初始化时不允许进行此类转换
```

在某些情况下，编译器可能无法确定几种可能的类型转换中哪一种是明确使用的最佳类型转换。我们会在后面讨论这种情况。但是，我们还不知道，编译器如何确定它是否可以将值从一种类型转换为另一种类型呢？

---

#### 10.2 Numberic promotions

前面我们提到过，C++中的每个基础类型都有一个最小size保证，但是实际上的size可能会因编译器和架构而不同。这种可变性，允许将 int 和 double 数据类型设置为在给定体系结构上最大限度地提高性能的大小。例如，一台 32 位计算机通常能够一次处理 32 位数据。在这种情况下，int 可能会设置为 32 位的宽度，因为这是 CPU 操作的数据的“自然”大小（并且可能是性能最高的）

由于C++的设计初衷是在各种体系结构中具有可移植性和高性能，因为C++设计人员不希望假设给定的CPU能够有效地操作比该CPU的自然数据大小更窄的值。

为了解决这个问题，C++定义了一类类型转换，非正式地命名为*numberic promotions*。numberic promotions是将某些较窄的数值类型（如字符）转换为某些较宽的数值类型（通常为 int 或 double），这些数值类型可以有效地处理，并且不太可能产生溢出的结果。

所有numberic promotions都是value-preserving保值的，也就是说，转换后的值始终等于该值，只是类型变了。源类型的所有值都可以在目标类型中精确表示，因此value-preserving保值转换被称为“安全转换”。

numeric promotion还有两个子类别，分别是integral promotions和floating point promotions。使用floating point promotions，我们可以将float转换为double，这意味着我们可以写一个double为参数的函数，然后使用float参数调用它。比如：

```c++
#include <iostream>

void printDouble(double d)
{
    std::cout << d << '\n';
}

int main()
{
    printDouble(5.0); // no conversion necessary
    printDouble(4.0f); // numeric promotion of float to double

    return 0;
}
```

integral promotions的问题相对复杂一点，使用integral promotions我们可以进行如下转换：

- signed char 或 signed short 可以转换为 int
- 如果 int 可以保存类型的整个范围，则 unsigned char、char8_t 和 unsigned short 可以转换为 int，否则可以转换为 unsigned int。
- 如果 char 默认是有符号的，则遵循上面的有符号 char 转换规则。如果默认情况下它是无符号的，则遵循上面的无符号字符转换规则
- bool 可以转换为 int，false 变为 0，true 变为 1

也就是说，我们可以编写一个带有int参数的函数，然后与其他整数类型一起使用，例如：

```c++
#include <iostream>

void printInt(int x)
{
    std::cout << x << '\n';
}

int main()
{
    printInt(2);

    short s{ 3 }; // there is no short literal suffix, so we'll use a variable for this one
    printInt(s); // numeric promotion of short to int

    printInt('a'); // numeric promotion of char to int
    printInt(true); // numeric promotion of bool to int

    return 0;
}
```

---

#### 10.3 Numeric Conversions

C++还支持另一类的数值类型转换，我们称为**numeric conversions**，包含物种基本类型：

- 将整数类型转换为任何其他整数类型（不包括intergral promotions）：

  ```c++
  short s = 3; // convert int to short
  long l = 3; // convert int to long
  char ch = s; // convert short to char
  unsigned int u = 3; // convert int to unsigned int
  ```

- 将浮点类型转换为任何其他浮点类型（不包括floating point promotions）

  ```c++
  float f = 3.0; // convert double to float
  long double ld = 3.0; // convert double to long double
  ```

- 将浮点类型转换为任意整数类型

  ```c++
  int i = 3.5; // convert double to int
  ```

- 将整数类型转换为任意浮点类型

  ```c++
  double d = 3; // convert int to double
  ```

- 将整型或浮点型转换为布尔值

  ```c++
  bool b1 = 3; // convert int to bool
  bool b2 = 3.0; // convert double to bool
  ```

与numeric promotion不同，numeric conversions在某些情况下是不能保证值不变的，所以是一种潜在的不安全的类型转换。数字转换分为三种安全性类别

- *Value-preserving*的转换是安全的numeric conversions，其中目标类型可以精确表示源类型中的所有值。比如将int转换为long，short转换为double都是安全的转换。
- *Reinterpretive* 转换是可能不安全的数字numeric conversions，其中结果可能超出源类型的范围。Signed/unsigned的转化属于这一类
- *Lossy*转换是可能不安全的numeric conversions，其中某些数据可能会在转换过程中丢失，比如double转换到int

---

#### 10.4 Narrowing conversions, list initialization, and constexpr

上一部分中，我们介绍了numberic conversions，它涵盖了基本类型之间的不同类型的转换。

在C++中，narrowing conversions是一种可能不安全的numberic conversions，因为目标类型可能无法保存源类型的全部值。以下转换都属于narrowing：

- 从floating point到integral
- 从floating point到较窄的floating point，除非要转换的值是constexpr并且位于目标类型的范围内（即使目标类型没有存储数字的所有有效数字的精度）
- 从integral到floating point，除非要转换的是constexpr且其值可以精准地存储在目标类型中。
- 从一个integral到另一个不能表示源类型所有值的integral，除非要转换的是constexpr且其值可以精准地存储在目标类型中

narrowing conversions并非总是可以避免的，尤其对函数调用来说。在这种情况下，最好使用`static_cast`将隐式narrowing conversions转换为显式的。这样有助于记录下narrowing conversions是有意的，并且会禁止编译器发出警告或报错。例如：

```c++
void someFunction(int i)
{
}

int main()
{
	double d{5.0};
	
	someFunction(d); // bad: implicit narrowing conversions will cause compiler warning
	
	// good: we explicitly telling compiler this narrowing conversion in intentional
	somFunction(static_cast<int>(d));
	
	return 0;
}
```

**也就是，如果我们要执行narrowing conversions，请务必使用`static_cast`将其转换为显式转换**

当我们使用大括号初始化时，就不能使用narrowing conversions了，否则会出现报错。这也是为什么我们首选大括号初始化作为初始化形式的主要原因之一。例如：

```c++
int main()
{
	int i{3.5}; // will not compile
	return 0;
}
```

如果确实要在大括号初始化中执行narrowing conversions，请使用`static_cast`转换为显式转换：

```c++
int main()
{
	double d {3.5};
	
	int i {static_cast<int>(d)};
	
	return 0;
}
```

如果在运行时之前不知道缩小转换的源值，则在运行时之前也无法确定转换的结果。在这种情况下，缩小转换是否保留值也要等到运行时才能确定。例如：

```c++
#include <iostream>

void print(unsigned int u) // note: unsigned
{
	std::cout << u << '\n';
}

int main()
{
	std::cout << "Enter an integral value";
	int n{};
	std::cin >> n; // enter 5 or -5
	print(n); // conversion to unsigned may or may not preserve value
	
	return 0;
}
```

---

#### 10.5 Arithmetic conversions

我们在[这一部分](https://www.learncpp.com/cpp-tutorial/operator-precedence-and-associativity/)中讨论过表达式是如何根据操作符的优先级和关联性进行计算的，考虑下面这个表达式：

```c++
int x {2 + 3};
```

`+`是一个二元操作符，且`2`和`3`都是`int`类型，得到的也会是`int`类型的5

但如果二元操作符的两个运算数的类型不一样呢：

```c++
??? y {2 + 3.5};
```

在这个例子中，`+`的运算数分别是`int`和`double`，那这个表达式所返回的结果是什么类型呢？

在C++中，某些操作符要求运算数属于同一种类型。如果使用不同类型的运算符调用操作数是，则其中一个或者两个运算符则会使用被称为**usual arithmetic conversions**的规则隐式地转换为匹配类型

**需要运算符类型一致的操作符包括：**

- 二元算数操作符`+` `-` `*` `/`
- 二元关系操作符`<` `>` `<=` `>=` `==` `!=`
- 二元位运算操作符 `&` `^` `|`
- 条件运算符`?`

然后，我们简化地介绍一下usual arithmetic conversions。编译器中有一个类型列表的排名，排名由高到低分别是：

- long double
- double
- float
- long long
- long
- int

我们使用以下规则来查找匹配类型：

- 如果一个运算数是integral类型，而另一个运算数是integral类型，则integral运算数将转换为integral运算数的类型
- 排名低的运算数将转换为排名高的运算数的类型

---

#### 10.6 Explicit type conversion (casting) and static_cast

在之前的章节中，我们讨论了编译器会通过隐式类型转换，将一种类型的值转换为另一种类型的值。

我们看下面这个例子：

```c++
double d = 10 / 4;
```

因为`10`和4都是`int`类型的，表达式执行的是整数除法，并且会得到一个`int`类型的`2`。这个值在用于初始化变量d之前，将进行numberic conversions，类型转换为`double`类型的`2.0`。然而，这并不是我们预期的结果。

表达式中的`10`和4都属于literal，如果我们将`int`类型的literal替换为`double`类型的interal，表达式就会进行除法运算，最终将`d`初始化为`2.5`

但是如果我们不使用literal而是变量进行初始化呢？考虑下面这个例子：

```c++
int x {10};
int y {4};
double d = x / y; // does integer division, initializes d with value 2.0
```

由于执行的是整数除法，`d`初始化的值是`2.0`。这种情况下，我们需要某种方法将运算数改为浮点型，从而告诉编译器执行浮点数除法。

幸运的是，C++附带了很多不同类型的转化操作符，程序员可以通过这些运算符来请求编译器执行类型转换，这种类型转换我们称为显示类型转换。

C++支持5种类型的强制转换：**C-style casts**, **static casts**, **const casts**, **dynamic casts**, **reinterpret casts**。后四种也会被称为**named casts**命名强制转换。我们先来看看C-style casts和static casts。而const casts和reinterpret casts应该尽可能避免使用。

在标准的C语言编程中，强制转换是通过操作符`()`实现的，括号内写的是目标类型。举例来说

```c++
#include <iostream>

int main()
{
	int x {10};
	int y {4};
	
	double d {(double)x / y}; // convert x to a double so we get floating point division
	std::cout << d << '\n'; // prints 2.5
	
	return 0;
}
```

C++中，允许我们用函数的形式来执行C-style cast，就像这样

```c++
double d {double(x) / y};
```

尽管C-style cast看起来像是一种单一形式的转换，但实际上它会根据上下文来执行不同形式的转换，这包括static casts, const casts和reinterpret casts。因此，C-style cast存在被无意中误用从而产生无法预估的行为的风险，所以还是尽可能地使用C++的强制转换。

C++引入了一个名为`static_cast`的强制转换操作符，用于将一种类型的值转换为另一种类型的值。`static_cast`需要一个表达式作为参数，并返回尖括号中指定的类型的计算值。下面是一个例子：

```c++
#include <iostream>

int main()
{
	char c {'a'};
	std::cout << c << ' ' << static_cast<int>(c) << '\n';
	
	return 0;
}
```

`static_cast`的主要优点是：它提供了编译时的类型检查，出错的概率更小，比如下面这个例子：

```c++
// a C-Style string literal can't be converted to an int, 
// so the following is an invalid conversion
int x {static_cast<int>("Hello")}; // will produce compile error
```

编译器通常会在执行可能不安全（narrowing）的隐式类型转换时发出警告。例如，请考虑以下程序

```c++
int i {48};
char ch = i; // implicit narrowing conversion
```

将`int`类型强制转换为`char`是不安全的，因为编译器无法分辨整数类型的值是否超出了`char`类型的范围，所以编译器往往会给出警告。如果我们使用了list初始化，编译器还会报错。

为了解决这个问题，我们可以使用`static_cast`来显式地将整数转换为`char`

```c++
int i {48};
char ch {static_cast<char>(i)};
```

当我们这样做时，我们明确地告诉了编译器这种转化是有意的，并且我们接受这种转换可能带来的后果（也就是溢出`char`的范围）。由于`static_cast`的输出类型是`char`，变量`ch`的初始化不会生成一个不匹配的结果，也就不会有报错。

---

#### 10.7 Typedefs and type aliases

在C++中，**using**是一个用于为现有数据类型创建别名的关键字。例如

```c++
using Distance = double; // define Distance as an alias for type double
```

定义之后，类型别名就可以用来任何需要使用该类型的地方。例如：

```c++
Distance milesToSchool {3.4}; // defines a variable of type double 
```

Historically，类型别名的命名方式主要有三种常见的约定

- 以"_t"为后缀，标准库通常将这种约定方式作为全局范围的类型名称，如size_t， nullptr_t。这种方法是继承自C语言，在C++中不太常用。

- 以"_type"为后缀，某些标准库类型（如 `std::string`）使用此约定来命名嵌套类型别名（例如 `std::string::size_type`）但是很多嵌套类型的别名根本不用后缀。

- 不用后缀。在现代 C++ 中，约定是以大写字母开头且不使用后缀来命名您自己定义的类型别名（或任何其他类型）。大写字母有助于将类型名称与变量和函数的名称（以小写字母开头）区分开来，并防止它们之间的命名冲突。使用这种约定方法是，通常会看到这样的例子：

  ```c++
  void printDistance(Distance distance); // Distance is some defined type
  ```

​	在这个例子中，`Distance`是类型别名，`distance`是函数参数名

类型别名实际上并不会定义一个新的、不同的类型，它只是为现有类型引入了一个新的标识符。类型别名与源类型源泉可以互换。这样一来，我们就可以实现一些更加明确的变量命名，例如：

```c++
int main()
{
	using Miles = long;
	using Speed = long;
	
	Miles distance {5};
	Speed mhz {3200};
}
```

而**typedef**是一种创建类型别名的旧方法。下面这两行代码所做的事情是一样的：

```c++
typedef long Miles;
using Miles = long;
```

**typedef**处于兼容的考量，依然被C++支持，但很大程度上已经被type alias取代。typedef首先有一些语法上的问题，我们容易忘记typedef 后面的是源类型还是类型别名

```c++
typedef Distance double; // incorrect (typedef name first)
typedef double Distance; // correct (aliased type name first)
```

其次，使用typedef可能会降低代码的易读性。

```c++
typedef int (*FcnType)(double, char);
using FcnType = int(*)(double, char);
```

目前为止，我们已经了解了什么是类型别名，现在我们来看看类型别名的用途。

##### 1 **Using type aliases for platform independent coding**

类型别名最主要的用途是隐藏特定于平台上的细节。在某些平台上，`int`是两个字节的，有些平台上`int`是4字节的。因此，在编写与平台无关的代码时，使用`int`存储超两个字节的信息就会有潜在的风险。

由于一些类型并没有指定大小，对于一些跨平台应用来说，使用类型别名来定义包含类型大小的别名是比较常见的。`int8_t` 将是 8 位有符号整数，`int16_t` 16 位有符号整数，`int32_t` 32 位有符号整数。以这种方式使用类型别名有助于防止错误，并更清楚地了解对变量大小所做的假设类型。这种类型别名通常与预处理器结合使用：

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

##### 2 **Using type aliases to make complex types easier to read**

C++中存在一些复杂又冗长的类型，比如：

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

     return 0;
}
```

每次都要输入`std::vector<std::pair<std::string, int>>`是很不方便的，这时我们就可以使用类型别名来提高代码的可读性并便于输入

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

##### 3 **Using type aliases to document the meaning of a value**

类型别名还可以帮助编写代码和理解。对于变量，我们有变量的标识符来帮助记录变量的用途。但请考虑函数返回值的情况。char、int、long、double 和 bool 等数据类型描述了函数返回的值类型，但更多时候我们想知道返回值的含义是什么。

举例来说，下面这个函数：

```c++
int gradeTest();
```

我们可能并不清楚这个函数的返回值的具体含义是什么。如果我们使用了函数别名：

```c++
using TestScore = int;
TestScore gradeTest();
```

##### 4 **Using type aliases for easier code maintenance**

类型别名还允许我们更改对象的基本类型。比如说，如果使用`short`类型来记录学生的ID序号，但是后面我们又决定使用`long`类型，则必须梳理大量的代码，将`short`替换为`long`。但是，如果使用类型别名，则更改类型将变得像更新类型别名一样简单（例如，从使用 `StudentId = short;` 改为 使用 `StudentId = long;`）。

虽然这似乎是一个不错的好处，但每当类型发生变化时，都必须小心，因为程序的行为也可能发生变化。当将类型别名的类型更改为不同类型族中的类型（例如，将整数更改为浮点值，或将有符号更改为无符号值）时，尤其如此！新类型可能存在比较或整数/浮点除法问题，或者旧类型没有的其他问题。如果将现有类型更改为其他类型，则应彻底重新测试代码。

---

#### 10.8 Type deduction for objects using the auto keyword

在简单的变量定义中，存在一个微妙的冗余：

```c++
double d {5.0};
```

在C++中，我们被要求为所有对象提供明确的类型。因此，我们指定变量 `d` 的类型为 `double`。但是，用于初始化变量`d`的iteral`5.0`也具有`double`类型（通过literal的格式隐式地决定）。如果我们希望变量及其初始值设定项具有相同的类型，则实际上我们提供了两次相同的类型信息。

**Type deduction**是C++中的一种功能，它允许编译器从对象的初始值中推断出对象的类型。要使用Type deduction，我们需要用关键字`auto`替代变量的类型：

```c++
int add(int x, int y)
{
    return x + y;
}

int main()
{
	auto d {5.0};
	auto i {1 + 2};
	auto x {i};
    auto sum {add(5, 6)};
	
	return 0;
}
```

Type deduction也可以和literal后缀结合使用，以判断特定的类型：

```c++
int main()
{
	auto a {1.23f}; // f suffix causes a to be deducted to float
	auto b {5u}; // u suffix causes b to be deducted to unsigned int
}
```

Type deduction不适用于没有初始值设定项或具有空初始值设定项的对象。当初始值设定项具有类型 `void`（或任何其他不完整类型）时，它也将不起作用。因此，以下代码中的type deduction都是无效的：

```c++
void foo()
{
}

int main()
{
	auto x;
	auto y {};
	auto z {foo()};
	
	return 0;
}
```

大多数情况下，type deduction会从推导类型中删除const或者constexpr限定符。如果我们希望推导出的变量类型是`const`或者`constexpr`，则需要我们手动添加

```c++
int main()
{
	const int x {5}; // x has const int
	auto y {x};      // y will be type int (const is dropped)
    
    constexpr auto z {x}; // z will be type const int
	
	return 0;
}
```

出于历史原因，C++中的字符串literal的类型比较特别，对字符串使用type deduction并不会得到预期的结果：

```c++
auto s {"Hello, world"}; // s will be type const char*, not std::string
```

如果我们想要推到出的类型为`std::string`或者`std::string_view`，我们需要使用`s`或者`sv`的literal后缀

```c++
#include <string>
#include <string_view>

int main()
{
	using namespace std::literals // easist way to access s and sv suffixes
	
	auto s1 {"goo"s}; // s1 will be std::string
	auto s2 {"moo"sv}; // s2 will be std::string_view
	
	return 0;
}
```

只是，在这种情况下，我们应该尽量避免使用type deduction

type deduction除了方便，还有一些别的好处。首先是提高代码可读性：

```c++
// harder to read
int a { 5 };
double b { 6.7 };

// easier to read
auto c { 5 };
auto d { 6.7 };
```

其次，`auto`可以帮助我们避免无意中漏掉初始化变量：

```c++
int x; // oops, we forgot to initialize x, but the compiler may not complain
auto y; // the compiler will error out because it can't deduce a type for y
```

另外就是`auto`可以保证代码中不会出现意外的、且影响性能的转换：

```c++
std::string_view getString(); 

std::string s1 {getString()}; // bad: expensive conversion from std::string_view to std::string
auto s2 {getString()}; // good: no conversion happened
```

type deduction会让代码中变量的类型没有那么直观。

**总结下来**

- **当对象的类型无关紧要时，对变量使用类型推导**
- **当您需要与初始值设定项的类型不同的特定类型时，或者当您的对象在使类型显而易见的上下文中使用时，最好使用显式类型**

---

#### 10.9 Type deduction for functions

考虑下面这段代码：

```c++
int add(int x, int y)
{
	return x + y;
}
```

当这个函数被编译时，编译器将确定x + y的结果为int，然后确保返回值的类型与函数的声明返回类型匹配（或者返回值的类型可以转换为函数声明的返回类型）

因为编译器已经需要从return语句中推到返回的类型，在C++14中，auto关键字可以代替函数的返回类型

```c++
auto add(int x, int y)
{
	return x + y;
}
```

当使用return作为函数的返回类型时，所有的返回语句都必须使用相同的数据类型，否则编译器会报错：

```c++
auto someFunction(bool b)
{
	if(b)
		return 5;
    else
    	return 6.4;
}
```

使用auto作为函数返回类型有一个缺点：在调用函数之间，需要完整地定义出函数，正向声明所提供的信息足够让编译器推到返回类型。例如下面这段代码就会报错：

```c++
#include <iostream>

auto foo();

int main()
{
	std::cout << foo() << '\n'; // compiler has only seen a forward declaration at this point
	return 0;
}

auto foo()
{
	return 5;
}
```

`auto`关键字还可用于使用**trailing return**的语法来声明函数，其中函数的返回类型指定在函数原型的后面：

```c++
auto add(int x, int y) -> int
{
	return (x + y);
}
```

在这种情况下，`auto`不执行类型推导，它只是使用**trailing return**语法的一部分。但是这种用法的意义是什么呢？一个好处是，可以是所有函数名称都排成一行：

```c++
auto add(int x, int y) -> int;
auto divide(double x, double y) -> double;
auto printSomething() -> void;
auto generateSubstring(const std::string &s, int start, int len) -> std::string;
```

还需要注意的是，`auto`不能用于函数参数，并且在C++20之前会导致编译错误

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

    return 0;
}
```

但是，这种情况下，auto也不会调用类型推导，反而是除法了一种称为函数模板的不同功能。

---

