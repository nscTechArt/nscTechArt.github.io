---
title: Chapter 11 Function Overloading and Function Templates
date: 2024-07-09 14:54 +0800
categories: [Programming, Learn C++]
tags: [C++]
---

### 11.1 Introduction to function overloading

我们首先考虑下面这段程序：

```c++
int add(int x, int y)
{
	return x + y;
}
```

这段程序将两个`int`值相加，但如果我们又需要让两个浮点数相加呢？当然我们可以再创建一个类似的函数：

```c++
int addInteger(int x, int y)
{
    return x + y;
}

double addDouble(double x, double y)
{
    return x + y;
}
```

然而，如果我们还需要一个类似的函数，用于三个整数相加，又该如何呢？管理函数命名就已经是个很大的问题了。

#### 11.1.1 Introduction to function overloading

C++为类似的问题提供了一个解决方法。函数重载允许我们使用一个函数命名创建多个函数，只要函数之间具有不同的函数类型（或者能够被编译器以其他方式进行区分。）这些命名相同的函数被称为重载函数，或者简称为重载。

以最开始的程序为例，我们可以简单地声明另一个`add`函数：

```c++
double add(double x, double y)
{
	return x + y;
}
```

#### 11.1.2 Introduction to overload resolution

此外，当调用一个已重载的函数时，编译器会尝试将函数调用与适当的重载匹配，我们将这个过程命名为重载解析。

### 11.2 Function overload differentiation

编译器区分重载的依据是参数的数量与参数的类型。需要注意的是，对于参数类型来说，不包括`typedefs`、类型别名、和const修饰符，包括`ellipse`。

函数的返回类型不能作为区分的依据。

对于成员函数来说，函数级别的修饰符（`const`、`volatile`、`ref`等）也可以用作定义重载函数。

下面我们来看一些例子

#### 11.2.1 Overloading based on number of parameters

参数类型可以作为区分重载函数的依据，例如

```c++
int add(int x, int y)
{
    return x + y;
}

int add(int x, int y, int z)
{
    return x + y + z;
}
```

#### 11.2.2 Overloading based on type of parameters

只要每个重载函数的参数类型列表不同，函数直接就可以被区分。例如下面这几个函数都可以被区分：

```c++
int add(int x, int y); // integer version
double add(double x, double y); // floating point version
double add(int x, double y); // mixed version
double add(double x, int y); // mixed version
```

由于类型别名（或`typedef`）并非不同的类型，所以使用了类型别名的重载函数本质上没有什么区别，不能被编译器区分。例如下面所有重载都会导致编译器报错：

```c++
typedef int Height;
using Age = int;

void print(int value);
void print(Height value);
void print(Age value);
```

对于按值传递的函数来说，const也不能作为区分的依据：

```c++
void print(int);
void print(const int); // these two are the same
```

### 11.3 Function overload resolution and ambiguous matches

虽然我们已经可以构建出可以相互区分开来的重载函数，但是我们还必须确保，在进行任何函数调用时，编译器可以找到匹配的函数声明。

由于存在多个可能能够匹配的重载函数，编译器需要确定哪个函数的匹配程度最高，从而完成调用，我们将这个过程称为重载解析。

我们来考虑下面这个程序：

```c++
#include <iostream>

void print(int x)
{
    std::cout << x << '\n';
}

void print(double x)
{
    std::cout << x << '\n';
}

int main()
{
    print('a');
    print(5L);
}
```

对于编译器来说，没有任何可以精准匹配的重载函数。

#### 11.3.1 Resolving overloaded function calls

当对重载函数进行函数调用时，编译器将逐步执行一系列规则以确定哪个（如果有的话）重载函数的匹配程度最高。

在每个步骤中，编译器会对实参应用一系列不同的类型转换，每次转换类型后，编译器都会检查当前是否有与之匹配的重载函数。当所有的类型转化转换和对应的检查完成后，这一步就解决了，同时会有三种可能的结果：

- 没有找到匹配的重载函数。编译器将移至序列的下一个步骤。
- 找到一个匹配的函数，并且该函数会被认为是最匹配的结果。后续的步骤不再执行
- 找到了多个匹配的函数，这会导致编译器报出`ambiguous call to overloaded function`的错误。

如果编译器在整个序列中都无法找到一个匹配的函数，则会导致编译错误。

#### 11.3.2 The argument matching sequence

接下来我们来详细地了解一下具体的匹配规则

1. **第一步**——编译器首先会试图寻找一个准确的匹配。这一步又可以细分为两个阶段

   1. 编译器将检查是否存在一个重载函数，其中函数调用的实参与重载函数的形参完全匹配。例如：

      ```c++
      void foo(int) {}
      
      void foo(double) {}
      
      int main() 
      {
      	foo(0);	 // exact math with foo(int)
          foo(3.4) // exact math with foo(double)
      }
      ```

      在这个例子中，编译器可以找到完全匹配的函数重载。

   2. 编译器会函数调用的实参应用一些trivial conversions。所谓的trivial conversions是以找到匹配为目的而执行的一组特定的转换规则，其中参数的类型会被修改，而不影响参数的值。具体包括：

      - 左值到右值的转换
      - 修饰符的转换（如non-const到const）
      - non-reference到reference转换

      我们看下面这个例子：

      ```c++
      void foo(const int) {}
      
      void foo(const double&) {}
      
      int main()
      {
          int x {1};
          foo(x); // x trivially converted from int to const int
      
          double d {2.3};
          foo(d); // d trivially converted from double to const double&
      }
      ```

      我们规定，通过trivial conversions找到的匹配会被认为是精准匹配。也就是，下面这段示例程序会被认为是ambiguous匹配：

      ```c++
      void foo(const int) {}
      
      void foo(const int&) {}
      
      int main()
      {
          int x {1};
          foo(x); // ambiguous match with foo(int) and foo(const int&)
      }
      ```

2. **第二步**——如果不存在精准匹配，编译器会通过数值提升的转换来试图找到匹配的函数。例如：

   ```c++
   void foo(int) {}
   
   void foo(double) {}
   
   int main()
   {
       foo('a');  // prompted to match foo(int)
       foo(true); // prompted to match foo(int)
       foo(4.5f); // prompted to match foo(double)
   }
   ```

3. **第三步**——如果数值提升没有找到匹配的函数，则编译器会通过数值转换来试图匹配。例如：

   ```c++
   #include <string>
   
   void foo(double) {}
   
   void foo(std::string) {}
   
   int main()
   {
       foo('a');  // 'a' converted to match foo(double)
   }
   ```

4. **第四步**——编译器通过开发者定义的转换来寻找匹配。虽然我们还没有讨论过user-defined conversion。我们来看下面这个简单的例子：

   ```c++
   class X
   {
   public:
       operator int() {return 0;} // here is  a user-define conversion from X to int
   };
   
   void foo(int) {}
   
   void foo(double) {}
   
   int main()
   {
       X x;
       foo(x);
   }
   ```

5. **第五步**——编译器通过省略号寻找匹配函数

6. **第六步**——编译失败

#### 11.3.3 Ambiguous matches

如果没有函数重载，那么函数调用只有两种结果，要么找到对应的函数，要么找不到并报错。而引入函数重载之后，就有了第三种情况，那就是编译器可以找到两个或者多个可以在同一个上述步骤中匹配的重载函数，也就是我们所说的ambiguous matches。

下面就是一个ambiguous匹配的例子：

```c++
void foo(unsigned int) {}

void foo(float) {}

int main()
{
    foo(0); // int can be numerically converted to unsigned int or to float
    foo(3.14159); // double can be numerically converted to unsigned int or to float
}
```

### 11.4 Deleting functions

有些情况下，编写的函数在用某些类型的值调用时，可能不会按预期工作。我们考虑下面这个例子：

```c++
#include <iostream>

void printInt(int x)
{
    std::cout << x << '\n';
}

int main()
{
    printInt(5); // okay
    printInt('a'); // prints 97 -- does this make sense?
    printInt(true); // prints 1 -- does this make sense?
}
```

对于后两个函数调用，虽然在语义上可能不成立，但是编译器不会有任何警告或报错。如果我们不想用`char`或者`bool`类型调用`printInt()`的话，要怎么做呢？

#### 11.4.1 Deleting a function using the `= delete` specifier

在某些情况下，如果我们明确不希望某个函数可以被调用，可以使用 `= delete` 指定符将该函数定义为已删除函数。如果编译器将函数调用匹配到已删除的函数，编译将因编译错误而中止。

还是使用刚才的例子，现在我们通过`= delete`让程序在语义上更加合理：

```c++
#include <iostream>

void printInt(int x)
{
    std::cout << x << '\n';
}

void printInt(char) = delete; // calls to this function will halt compilation
void printInt(bool) = delete; // calls to this function will halt compilation

int main()
{
    printInt(97);   // okay

    printInt('a');  // compile error: function deleted
    printInt(true); // compile error: function deleted

    printInt(5.0);  // compile error: ambiguous match
}
```

对于 `printInt(5.0);`  来说，编译器会首先检查有没有能够精确匹配的`printInt(double)`。在我们的程序中，并没有，所以接下来编译器会试着寻找最合适的匹配。虽然`printInt(int)`是唯一的没有被`= delete`的函数，但是被delete的函数仍会被视为函数重载解析中的备选函数。所以在我们的示例程序中，会得到ambiguous match的结果。

> `= delete`实际上的含义是“该函数被禁止”，而非“该函数不存在”。被删除的函数仍然会作为候选参与到重载解析的所有阶段中，但如果最后选中的被删除的函数，则会导致编译报错。
{: .prompt-info}

#### 11.4.2 Deleting all non-matching overloads

删除一系列单独的函数重载是可行的，但可能会显得冗长。有时我们希望某个函数只能用类型与函数参数完全匹配的参数调用。我们可以通过使用函数模板来实现，如下所示：

```c++
#include <iostream>

// This function will take precedence for arguments of type int
void printInt(int x)
{
    std::cout << x << '\n';
}

// This function template will take precedence for arguments of other types
// Since this function template is deleted, calls to it will halt compilation
template <typename T>
void printInt(T x) = delete;

int main()
{
    printInt(97);   // okay
    printInt('a');  // compile error
    printInt(true); // compile error

    return 0;
}
```

### 11.5 Default arguments

default argument是我们为函数形参提供的一个默认值，例如：

```c++
void print(int x, int y = 10) // 10 is the default argument
```

当进行函数调用时，如果我们没有提供对应的实参，函数则会使用默认参数。例如下面这段程序：

```c++
#include <iostream>

void print(int x, int y=4) // 4 is the default argument
{
    std::cout << "x: " << x << '\n';
    std::cout << "y: " << y << '\n';
}

int main()
{
    print(1, 2); // y will use user-supplied argument 2
    print(3); // y will use default argument 4, as if we had called print(3, 4)
}
```

实际上，当编译器调用`print(3)`时，它会将此函数调用重写为`print(3, 4)`，以便实参数量与形参数量匹配。

需要注意的是，我们必须使用等号指定默认参数，使用括号或者大括号初始化是错误的：

```c++
void foo(int x = 5);   // ok
void goo(int x ( 5 )); // compile error
void boo(int x { 5 }); // compile error
```

#### 11.5.1 Default arguments can not be redeclared, and must be declared before use

对于具有前向声明与函数定义的函数来说，我们只能在一处声明默认参数，而不能同时声明。例如下面这段程序就无法通过编译：

```c++
#include <iostream>

void print(int x, int y=4); // forward declaration

void print(int x, int y=4) // compile error: redefinition of default argument
{
    std::cout << "x: " << x << '\n';
    std::cout << "y: " << y << '\n';
}
```

所以最好的做法是，如果函数有前向定义，将默认参数放在前向定义中，否则就放在函数定义中。

#### 11.5.2 Default arguments and function overloading

具有默认参数的函数也是可以重载的，例如下面这段函数：

```c++
#include <iostream>
#include <string_view>

void print(std::string_view s)
{
    std::cout << s << '\n';
}

void print(char c = ' ')
{
    std::cout << c << '\n';
}

int main()
{
    print("Hello, world"); // resolves to print(std::string_view)
    print('a');            // resolves to print(char)
    print();               // resolves to print(char)
}
```

### 11.6 Function templates

比方说我们想要比较两个值中的较大值，我们可以实现一个下面的函数：

```c++
int max(int x, int y)
{
	return (x < y) ? y : x;
}
```

如果我们还想比较两个double类型的数值，则我们可以再写一个重载函数。但是当我们想要比较各种类型的数值呢？我们不能为每一种类型编写一个对应的重载函数。

所以，我们需要一个单一版本的max()函数，它可以处理任何类型的参数。C++为我们提供了解决方法：函数模板。

函数模板是一种函数式的定义，用于生成一个或多个重载函数，每个函数都有一组不同的实际类型。

当我们创建函数模板时，我们对任何参数类型、返回类型、或者函数体中使用的类型都使用占位符类型（或者称为模板类型），以便稍后指定这些类型。

C++支持三种不同类别的模板参数：

- type模板参数，表示一个特定类型
- non-type模板参数，表示一个`constexpr`值
- 模板模板参数，表示一个模板

#### 11.6.1 Creating a templated max function

我们要将下面这个函数改写为函数模板：

```c++
int max(int x,int y)
{
	return (x < y) ? y : x;
}
```

在这个函数中，我们使用了三次`int`类型，分别是函数的返回类型，以及函数两个形参的类型。

为了创建一个函数模板，我们需要完成两个任务。首先是用类型模板参数替换特定的参数，在我们的例子中，也就是用一个类型模板参数`T`替换`int`：

```c++
T max(T x, T y)
{
	return (x < y) ? y : x;
}
```

但此时编译器会报错，因为我们还没有定义出`T`，对编译器来说，这仍然是一个正常的函数，而编译器不知道`T`是什么类型

接下来，我们要做的就是告诉编译器这是一个函数模板，并且`T`是一个**type template parameter**，也就是类型的占位符。具体的做法是使用**template parameter declaration**。模板参数声明的scope被限制在紧随其后的函数模板（或class模板）中。这也意味着，每个函数模板都需要自己的模板参数声明。

```c++
template <typename T> // this is the template parameter declaration
T max(T x, T y)
{
	return (x < y) ? y : x;
}
```

关键字`template`会告诉编译器我们正在创建一个模板，接下来，我们在尖括号中指定我们的模板将使用的所有模板参数，对于每个类型模板参数，我们使用关键字`typename`来指定，后跟对应的名称

### 11.7 Function template instantiation

我们现在已经了解了什么是函数模版，已经怎么将一个普通函数转写为函数模版，现在我们来看看函数模板是怎么用的。

函数模版实际上并不是函数，函数模版的代码并不会直接地被编译或运行。相反，函数模版有一个任务：生成（可以被编译和执行的）函数。

还是以函数max()为例，当我们使用这个函数模版时，需要按照这样的语法进行函数调用：

```c++
max<actual_type>(arg1, arg2);
```

它与正常的函数调用的主要区别在于，添加了位于尖括号内的类型（被称为类型实参），用于表示用于取代模板类型`T`的实际类型。具体的代码如下：

```c++
#include <iostream>

template <typename T>
T max(T x, T y)
{
    return (x < y) ? y : x;
}

int main()
{
    std::cout << max<int>(1, 2) << '\n';
}
```

当编译器遇到函数调用`max<int>(1, 2)`时，它将确定不存在对于`max<int>(int, int)`的定义，所以编译器会隐式地使用`max<T>`函数模版来创建一个函数。

从函数模版中创建有具体类型的函数的过程被称为函数模版实例化。隐式实例化指的是一个函数通过函数调用而被实例化，并且该函数我们称之为函数实例。

函数实例化的过程其实很简单：本质上编译器复制了函数模版，并将模版类型替换为我们指定的实际类型。

#### 11.7.1 Template argument deduction

在大多数情况下，我们想要用于实例化的实际类型会与函数的参数类型匹配，例如：

```c++
std::cout << max<int>(1, 2) << '\n';
```

在这个函数调用中，我们指定了用`int`代替`T`，同时我们也使用了`int`类型的实参。

当函数调用的实参类型与我们想要指定的类型相匹配时，我们就不需要在尖括号内指定出该类型了。我们可以使用模板实参推导，从而让编译器推导出函数调用所需要的类型。

例如，我们可以将下面这个语句

```c++
std::cout << max<int>(1, 2) << '\n'; // specifying we want to call max<int>
```

改写为：

```c++
std::cout << max<>(1, 2) << '\n';
std::cout << max(1, 2) << '\n';
```

两种情况中，编译器都会注意到我们没有提供一个实际的类型，所以编译器会尝试从函数实参中推导出实际类型，从而生成`max()`函数，其中所有模版参数都与提供的实参类型匹配。

虽然两个语句的结果相同，但实际上还是有一些差别的，主要体现在编译器如何从一组函数重载中解析函数调用有关。在第一个语句中，编译器在确定要调用的重载函数时，只会考虑`max<int>`模版函数进行重载。而第二个雨季中，编译器还会额外考虑到`max`非模版函数重载。

我们可以通过下面这个程序来验证一下我们的结论：

```c++
#include <iostream>

template <typename T>
T max(T x, T y)
{
    std::cout << "called max<int>(int, int)\n";
	return (x < y) ? y : x;
}

int max(int x, int y)
{
    std::cout << "called max(int, int)\n";
    return (x < y) ? y : x;
}

int main()
{
    std::cout << max<int>(1, 2) << '\n'; // calls max<int>(int, int)
    std::cout << max<>(1, 2) << '\n'; // deduces max<int>(int, int)
    std::cout << max(1, 2) << '\n'; // calls max(int, int);
}
```

所以，我们可以得出这样的一个结论：大多数情况下，我们将使用普通函数调用的语法来调用从函数模版中实例化的函数。

这样做出于多个原因：

- 这种语法相对更简明
- 同时有一个匹配的非模版函数与函数模板的情况比较少
- 如果确实有这样的情况，这种语法则会优先调用非函数模版。

#### 11.7.2 Function templates with non-template parameters

我们创建同时具有模板参数与非模版参数的函数模版。其中，类型模板参数可以匹配各种类型，而非模板参数的工作方式与普通函数参数累类似。

我们看下面这个例子：

```c++
// T is a type template parameter
// double is a non-template parameter
// We don't need to provide names for these parameters since they aren't used
template <typename T>
int someFcn (T, double)
{
    return 5;
}

int main()
{
    someFcn(1, 3.4); // matches someFcn(int, double)
    someFcn(1, 3.4f); // matches someFcn(int, double) -- the float is promoted to a double
    someFcn(1.2, 3.4); // matches someFcn(double, double)
    someFcn(1.2f, 3.4); // matches someFcn(float, double)
    someFcn(1.2f, 3.4f); // matches someFcn(float, double) -- the float is promoted to a double
}
```

### 11.8 Using function templates in multiple files

在多个文件中需要的模板应该在头文件中定义，然后在需要时包含。这允许编译器查看完整的模板定义并在需要时实例化模板。

下面是一个实例程序：

```c++
#ifndef MAX_H
#define MAX_H

template <typename T>
T max(T x, T y)
{
    return (x < y) ? y : x;
}

#endif
```
{: file="max.h"}

```c++
#include "max.h" // import template definition for max<T>(T, T)
#include <iostream>

void foo()
{
	std::cout << max(3, 2) << '\n';
}
```
{: file="foo.cpp"}

```c++
#include "max.h" // import template definition for max<T>(T, T)
#include <iostream>

void foo(); // forward declaration for function foo

int main()
{
    std::cout << max(3, 5) << '\n';
    foo();

    return 0;
}
```
{: file="main.cpp"}


### 11.9 Function templates with multiple template types

考虑下面这段函数：

```c++
#include <iostream>

template <typename T>
T max(T x, T y)
{
    return (x < y) ? y : x;
}

int main()
{
    std::cout << max(2, 3.5) << '\n'; // compile error
}
```

这段代码实际上无法编译的。在我们的函数调用`max(2, 3.5)`中，我们使用了两种类型不一样的实参，一个是`int`一个是`double`。由于我们没有在尖括号中指定出实际类型，编译器首先会检查有没有能够匹配的非模版函数`max(int, double)`。很明显，没有。

接下来，编译器会使用模版参数推导来检查有没有匹配的函数模版。这一步同样会失败，原因很简单，T只能表示一个单一类型。编译器无法通过函数模版`max<T>(T, T)`来实例化一个参数类型不一致的函数。或者我们从另一种角度来思考：因为在函数模版中，参数的类型都是`T`，所以必须解析为同一个类型。

既没有匹配的非模版函数，也没有匹配的函数模版，编译器无法解析这个函数调用，并最终会给出报错。

当然你可能会疑惑，为什么编译器不能生成函数`max<double>(double, double)`，然后通过数值转换将实参的`int`类型转换为`double`类型，从而完成函数调用呢？答案很简单，因为类型转换只能在解析函数重载时完成，而不是在类型实参推导时进行。

所以，我们需要其他的方法来修复这个bug。幸运的是，我们有三种可选的方案

#### 11.9.1 Use static_cast to conver the argument to matching types

第一种解决方案是，在函数调用中手动将实参类型转换为匹配的类型。即：

```c++
#include <iostream>

template <typename T>
T max(T x, T y)
{
    return x < y ? y : x;
}

int main()
{
    std::cout << max(static_cast<double>(2), 3.5) << '\n';
}
```

这样的话，两个实参都是double类型，编译器可以正常地使用模板类型推导，并实例化`max(double, double)`。只是这种方法会影响代码的易读性。

#### 11.9.2 Provide an explicit type template argument

如果在程序中，我们已经定义了一个非模版函数`max(double, double)`函数，那么我们就可以调用了`max(int, double)`，编译器是进行隐式类型转换，通过数值提升将`int`转换为`double`，所以函数调用可以正常进行。就像这样：

```c++
#include <iostream>

double max(double x, double y)
{
    return (x < y) ? y : x;
}

int main()
{
    std::cout << max(2, 3.5) << '\n'; // the int argument will be converted to a double
}
```

然而，当编译器进行模板参数推导时，它不会执行任何类型转换。那我们不进行模板参数推导不就行了吗？换句话说，我们显式地指定出模板参数类型，就可以避免模板参数推导了：

```c++
#include <iostream>

template <typename T>
T max(T x, T y)
{
    return (x < y) ? y : x;
}

int main()
{
    // we've explicitly specified type double, so the compiler won't use template argument deduction
    std::cout << max<double>(2, 3.5) << '\n';
}
```

在这段承租中，由于我们已经指定了用`double`类型代替模版参数`T`，所以编译器不会进行模板参数推导，它只会实例化函数max<double>(double, double)，然后对于没有匹配的`int`，再执行类型转换即可。

这种方法相对`static_cast`来说更为方便且已读，但是我们还是需要在函数调用时，明确实际的参数类型，这样的做法本质上与函数模版的思想相悖。

#### 11.9.3 Function templates with multiple template type parameters

我们所讨论的这个问题的根源在于，我们的函数模版中只有一个模版参数`T`，所以两个参数的类型需要保持一致。

那么，解决这个问题的最好办法就是重写函数模版，从而让函数的参数可以被解析为不同的类型，也就是再引入一个模板参数：

```c++
#include <iostream>

template <typename T, typename U>
T max(T x, U y)
{
    return x < y ? y : x;
}

int main()
{
    std::cout << max(2, 3.5) << '\n';
}
```

由于参数`x`和参数`y`分别使用了不同的模板参数，所以它们的解析是互不相关的。所以在这个函数调用中，编译器会实例化`max<int, double>(int , double)`。

但这段程序中仍在存在问题。根据算数规则，我们知道`double`的优先级高于`int`，所以条件运算符的返回类型是`double`，但在我们的函数模版中，返回类型被定义为`T`，也就是会被解析为`int`类型，也就是说返回值会进行缩窄转换到`int`，从而有潜在的数据丢失的风险。

将函数模版的返回类型替换为`U`也不能解决问题，我们在函数调用时可以随意切换两个实参的顺序。

我们应该做的是，使用`auto`作为返回类型，让编译器从返回语句中推导返回类型：

```c++
#include <iostream>

template <typename T, typename U>
auto max(T x, U y)
{
    return x < y ? y : x;
}

int main()
{
    std::cout << max(2, 3.5) << '\n';
}
```
{: add-lines="4"}

#### 11.9.4 Abbreviated function templates

C++20 引入了 `auto` 关键字的新用法：当 `auto` 关键字用作普通函数的参数类型时，编译器会自动将该函数转换为函数模板，每个 `auto` 参数都会变成一个独立的模板类型参数。这种创建函数模板的方法称为简化函数模板。

例如:

```c++
auto max(auto x, auto y)
{
    return x < y ? y : x;
}
```

就是C++20中对于以下内容的简写：

```c++
template <typename T, typename U>
auto max(T x, U y)
{
    return (x < y) ? y : x;
}
```

需要注意的是，对于只有一个模板参数的函数模版来说，我们最好不要使用这个特性。

#### 11.9.5 Function templates may be overloaded

就像函数可以重载那样，函数模板也可以实现重载。我们可以看下面这个示例程序：

```c++
#include <iostream>

// add two values with matching types
template <typename T>
T add(T x, T y)
{
    return x + y;
}

// add two values with non-matching types
// as of C++20, we could also use abbreviated function templates
template <typename T, typename U>
T add(T x, U y)
{
    return x + y;
}

// add three values with any type
// as of C++20, we could also use abbreviated function templates
template <typename T, typename U, typename V>
T add(T x, U y, V z)
{
    return x + y + z;
}

int main()
{
    std::cout << add(1.2, 3.4) << '\n'; // instantiates and calls add<double>()
    std::cout << add(5.6, 7) << '\n';   // instantiates and calls add<double, int>()
    std::cout << add(8, 9, 10) << '\n'; // instantiates and calls add<int, int, int>()
}
```

需要注意的是，对于函数调用`add(1.2, 3.4)`，编译器会更倾向于`add<T>`，而非`add<T, U>`，虽然二者都可以与函数调用匹配。

确定多个匹配函数模板中应该优先选择哪个模板的规则称为“函数模板的部分排序”。简而言之，限制性/专门性更强的函数模板将被优先选择。在这种情况下，`add<T>` 是更限制性的函数模板（因为它只有一个模板参数），所以它会被优先选择。

如果有多个函数模板可以匹配一个调用，但编译器无法确定哪个更限制性，则编译器会因为匹配模糊而报错。

### 11.10

在前面的内容中，我们讨论了如何创建使用类型模板参数的函数模板。类型模板参数作为占位符，用于传递实际类型作为模板参数。

虽然类型模板参数是最常用的模板参数类型，但还有另一种值得了解的模板参数：非类型模板参数。

非类型模板参数是具有固定类型的模板参数，作为传递给模板的 `constexpr` 值的占位符。这意味着在模板实例化时，非类型模板参数的值必须是编译时常量。

非类型的模版参数可以是一下任意一种类型：

- 整数类型
- 枚举类型
- `std::nullprt_t`
- 浮点数类型（C++20）
- 一个对象的指针或引用
- 一个成员函数的指针或引用
- 文本class类型（C++20）

我们来看一个例子：

```c++
#include <iostream>

template <int N> // declare a non-type template parameter of type int named N
void print()
{
    std::cout << N << '\n';
}

int main()
{
    print<5>(); // 5 is our non-type template argument
}
```

#### 11.10.2 What are non-type template parameters useful for?

在 C++20 中，函数参数不能是 `constexpr`。这对于普通函数、`constexpr` 函数（因为它们必须能够在运行时运行）以及可能令人惊讶的 `consteval` 函数都是如此。这意味着你不能在函数声明中指定参数为 `constexpr`，即使该函数本身是 `constexpr` 或 `consteval`。

我们来看下面这个程序：

```c++
#include <iostream>
#include <cassert>
#include <cmath>

double getSqrt(double d)
{
    assert(d >= 0 && "getSqrt(): d must be non-negativbe");

    // the assert above will probably be compile out in non-debug builds
    if (d >= 0)
        return std::sqrt(d);

    return 0.0;
}

int main()
{
    std::cout << getSqrt(5.0) << '\n';
    std::cout << getSqrt(-5.0) << '\n';
}
```

当我们运行这段代码时，当调用 `getSqrt(-5.0)` 时，程序在运行时会触发断言（assert）错误。这确实比没有任何检查要好，因为它至少在调试模式下可以捕捉到错误。然而，因为 `-5.0` 是一个字面值（并且隐式地是 `constexpr`），所以更好的做法是使用 `static_assert` 在编译时捕捉此类错误。

然而，`static_assert` 需要一个常量表达式（constant expression），而函数参数不能是 `constexpr`，这意味着我们不能直接在函数内部使用 `static_assert` 来检查传入参数的值。

如果我们将函数参数改为非类型模板参数，我们就可以解决这个问题：

```c++
#include <iostream>
#include <cmath>

template <double D> // requires C++20 for floating point non-type parameters
double getSqrt()
{
    static_assert(D >= 0.0, "getSqrt(): D must be non-negative");
    if constexpr (D >= 0)
        return std::sqrt(D);
    return 0.0;
}

int main()
{
    std::cout << getSqrt<5.0>() << '\n';
    std::cout << getSqrt<-5.0>() << '\n';
}
```

> 非类型模板参数主要用于当我们需要将 `constexpr` 值传递给函数（或类类型）时，以便它们可以在需要常量表达式的上下文中使用。
{: .prompt-info}

从C++17开始，非类型模板参数也可以使用关键字`auto`让编译器从模版参数中进行推导，例如：

```c++
#include <iostream>

template <auto N> // deduce non-type template parameter from template argument
void print()
{
    std::cout << N << '\n';
}

int main()
{
    print<5>();   // N deduced as int `5`
    print<'c'>(); // N deduced as char `c`
}
```

