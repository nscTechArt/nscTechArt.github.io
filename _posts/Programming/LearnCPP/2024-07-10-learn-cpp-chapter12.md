---
title: Compound Types References and Pointers
date: 2024-07-10 09:55 +0800
categories: [Programming, Learn C++]
tags: [C++]
---

随着我们开发的程序越来越复杂，C++中的基础类型已经逐渐无法实现一些复杂的需求。我们来看一个例子。

假设我们想实现一个数学程序，用于计算两个分数。那么我们应该如果通过代码来表示分数呢？可能会想要通过一对int值来实现，例如：

```c++
#include <iostream>

int main()
{
    // first fraction
    int num1 {};
    int den1 {};

    // second fraction
    int num2 {};
    int den2 {};

    // used to remove the slash between the numerator and denominator
    char ignore {};

    std::cout << "Enter a fraction: ";
    std::cin >> num1 >> ignore >> den1;

    std::cout << "Enter a fraction: ";
    std::cin >> num2 >> ignore >> den2;

    std::cout << "The two fractions multiplied: " << num1 * num2 << '/' << den1 * den2 << '\n';
}
```

虽然这个程序可以运行，但是仍存在一些问题。首先，每对整数之间的联系相对松散——除了注释和它们在代码中的使用上下文外，很难看出每对分子和分母是相关的。其次，按照DRY（不要重复自己）原则，我们应该创建一个函数来处理用户输入的分数（并包含一些错误处理）。然而，函数只能返回一个值，那么我们如何将分子和分母返回给调用者呢？

显然，基础类型已经不能满足我们的需求了

#### 12.1.1 Compound data types

在C++中，复合类型是通过其他复合类型与基础类型构造而来的。每个复合类型都有其自己独特的属性。

C++支持以下复合类型：

- 函数
- 数组
- 指针类型
  - 函数指针
  - 对象指针
- 成员类型的指针
  - 数据成员的指针
  - 函数成员的指针
- 引用类型
  - 左值引用
  - 右值引用
- 枚举类型
  - 无范围的枚举
  - 有范围的枚举
- class类型
  - 结构体
  - class
  - union

我们对于函数这个复合类型已经比较熟悉了，例如：

```c++
void doSomething(int x, double y) {}
```

这个函数的类型是`void(int, double)`

本篇博客中，我们将逐一介绍上述的这些复合类型。

### 12.2 Value categories (lvalues and rvalues)

我们知道，C++中的表达式有三种作用：

- 计算得出一个单一值
- 产生side effects
- 计算得到对象或函数

前两点我们已经比较熟悉了，而要理解第三点，我们需要首先清楚C++中的表达式都有两个属性：**类型**type与**值类别**value category。我们分别展开讨论一下。

#### 12.2.1 The type of an expression

表达式的类型等同于表达式经过计算得到的值、对象或函数的类型。我们可以看下面两个表达式：

```c++
int main()
{
    auto v1 {12 / 4};   // type of expression => int
    auto v2 {12.0 / 4}; // type of expression => double
}
```

编译器可以根据表达式的类型判断在给定的上下文中，表达式是否有效，例如：

```c++
#include <iostream>

void print(int x)
{
    std::cout << x << '\n';
}

int main()
{
    print("foo"); 
    // error: print() was expecting an int argument, 
    // we tried to pass in a string literal
}
```

需要注意的是，表达式类型必须在需要在编译时确定，而表达式的值既可以在编译时确定(constexpr），也可以在运行时确定（非constexpr）

#### 12.2.2 The value category of an expression

我们看下面这个程序：

```c++
int main()
{
    int x{};

    x = 5; // valid: we can assign 5 to x
    5 = x; // error: can not assign value of x to literal value 5
}
```

其中，第一个赋值语句是有效的，而另一个赋值语句却会触发编译器报错。那么编译器是如何知道哪些表达式可以赋值语句中任意一侧被有效地使用呢？

答案是表达式的值类别属性，它表示了表达式的求职结果与生命周期的特性。在C++11之前，只有两种值类别：`lvalue`与`rvalue`。C++11引入了三个额外的值类型：`glvalue`，`prvalue`，`xvalue`，从而可以支持一个名为`move semantic`的新特性。

我们暂时只先讨论左值和右值。其余的值类型将在以后的相关博客中讨论。

#### 12.2.3 Lvalue and rvalue expressions

左值是指可以取地址的表达式，即存储在某个内存未知，可以持久存在。例如

```c++
int x = 10;
int& ref = x; // x is a lvalue
```

同时，由于常量的存在，左值还可以被细分为可修改的左值以及不可修改的左值（即左值是`const`或`constexpr`）。

而右值指的是不能取地址的临时值，通常作为表达式的结果，不能长久存在。例如：

```c++
int y = x + 5; // (x + 5) is a rvalue
```

> 左值表达式求值为一个可识别的对象。而右值求职为一个值。
{: .prompt-info}

现在我们可以回答前面关于赋值语句的问题了。赋值运算符`=`要求左侧的运算数是可修改的左值表达式，而右侧的运算数需要四号一个右值表达式。

#### 12.2.4 Lvalue to rvalue conversion

当我们表达式需要一个右值，而我们提供了一个左值时，左值会隐式地转换为右值。例如：

```c++
int main()
{
	int x {1};
    int y {2};
    
    x = y;
}
```

### 12.3 Lvalue references

在C++中，引用是对已有对象的别名。一旦定义了引用，对引用的任何操作都将应用于被引用的对象。

> 引用本质上与被引用的对象相同
{: .prompt-info}

现代C++中包含了两种引用，左值引用和右值引用。我们先来讨论一些左值引用。

#### 12.3.1 Lvalue reference types

左值引用（通常被简称为引用）充当现有左值（例如变量）的别名。想要声明一个左值变量类型，我们在类型声明中使用`&`，也就是：

```c++
int      // a normal int type
int&     // an lvalue reference to an int object
double&  // an lvalue reference to a double object
```

#### 12.3.2 Lvalue reference variables

通过左值引用类型，我们可以创建一个左值引用变量：

```c++
#include <iostream>

int main()
{
    int x { 5 };    // x is a normal integer variable
    int& ref { x }; // ref is an lvalue reference variable that can now be used as an alias for variable x

    std::cout << x << '\n';  // print the value of x (5)
    std::cout << ref << '\n'; // print the value of x via ref (5)
}
```

#### 12.3.3 Modifying values through an lvalue reference

通过引用，我们不仅可以读取被引用对象的值，也可以修改被引用对象的值，例如：

```c++
#include <iostream>

int main()
{
    int x { 5 }; // normal integer variable
    int& ref { x }; // ref is now an alias for variable x

    std::cout << x << ref << '\n'; // print 55

    x = 6; // x now has value 6

    std::cout << x << ref << '\n'; // prints 66

    ref = 7; // the object being referenced (x) now has value 7

    std::cout << x << ref << '\n'; // prints 77
}
```

#### 12.3.4 Initialization of lvalue references

与常量一样，所有的引用在声明的时候必须进行初始化。当引用被一个对象（或函数）初始化时，我们说它被绑定到那个对象（或函数）。这种引用绑定的过程被称为引用绑定。被引用的对象（或函数）有时被称为被引用体

引用必须绑定给一个可修改的左值，绑定给不能修改的左值或右值将会导致编译报错，例如：

```c++
int main()
{
    int x { 5 };
    int& ref { x }; // valid: lvalue reference bound to a modifiable lvalue

    const int y { 5 };
    int& invalidRef { y };  // invalid: can't bind to a non-modifiable lvalue
    int& invalidRef2 { 0 }; // invalid: can't bind to an rvalue

    return 0;
}
```

大多数情况下，引用的类型需要与引用体的类型匹配（也有例外，我们会在继承的相关内容中讲到）：

```c++
int main()
{
    int x { 5 };
    int& ref { x }; // okay: reference to int is bound to int variable

    double y { 6.0 };
    int& invalidRef { y }; // invalid; reference to int cannot bind to double variable
    double& invalidRef2 { x }; // invalid: reference to double cannot bind to int variable
}
```

另外，左值引用的引用体也不能是`void`（有什么意义呢？）

#### 12.3.5 Reference cannot be reseated(change to refer to another object)

一旦初始化后，引用就不能被重新绑定给其他对象了。我们考虑下面这个程序：

```c++
#include <iostream>

int main()
{
    int x {5};
    int y {6};

    int& ref {x}; // now ref is an alias for x

    ref = y; // assigns 6 (the value of y) to x

    std::cout << x << '\n';
}
```

在这个实例中，因为`ref`已经被绑定给`x`，所以`ref = y`并不能将`ref`设置为`y`的引用，而是会用`y`的值来修改`x`

#### 12.3.6 Lvalue reference scope and duration

引用变量遵循与普通变量相同的作用域和生命周期规则：

```c++
#include <iostream>

int main()
{
    int x { 5 }; // normal integer
    int& ref { x }; // reference to variable value

     return 0;
} // x and ref die here
```

#### 12.3.7 References and referents have independent lifetims

有一个例外，引用的生命周期与对应引用体的生命周期是无关的。换句话说，下面两种说法都是正确的：

- 一个引用可以在被引用对象销毁之前被销毁
- 被引用的对象可以在引用销毁之前被销毁

当引用被提前销毁时，引用体不会收到任何影响，例如：

```c++
#include <iostream>

int main()
{
    int x { 5 };

    {
        int& ref { x };   // ref is a reference to x
        std::cout << ref << '\n'; // prints value of ref (5)
    } // ref is destroyed here -- x is unaware of this

    std::cout << x << '\n'; // prints value of x (5)
} // x destroyed here
```

#### 12.3.8 Dangling references

当被引用的对象在引用它的引用之前被销毁时，该引用就会指向一个不再存在的对象。这样的引用称为悬空引用。访问悬空引用会导致未定义行为。

#### 12.3.9 References aren't objects

在C++中，引用并非对象，它不需要存在或占用内存空间。如果可能的话，编译器会通过将引用的所有出现替换为被引用体来优化引用。但这种做法也并非总是可行的，此时引用可能会需要存储空间。

由于引用不是对象，它们不能在需要对象的地方使用（例如，不能有引用的引用，因为左值引用必须引用一个可识别的对象）。

### 12.4 Lvalue reference to const

现在我们知道，一个左值引用只能绑定到一个可修改的左值上。所以下面这个程序会编译错误：

```c++
const int x {5};
int& ref {x}; // error: ref cannot bind to non-modifiable lvalue
```

但是如果我们需要为一个const变量创建引用，要怎么办呢？

#### 12.4.1 Lvalue reference to const

当声明一个引用时，使用const关键字就可以将引用与一个不可修改的左值绑定，例如

```c++
const int x {5};
const int& ref {x};
```

对于const引用来说，只能访问引用体的值，而不能通过引用修改（因为其本身就不能被修改）

#### 12.4.2 Initializing an lvalue reference to const with a modifiable lvalue

常量左值引用也可以绑定到可修改的左值上。这种情况下，当我们通过引用访问引用体时，引用体将会被视为const，但引用体本身仍然是可修改的。例如：

```c++
#include <iostream>

int main()
{
    int x { 5 };          // x is a modifiable lvalue
    const int& ref { x }; // okay: we can bind a const reference to a modifiable lvalue

    std::cout << ref << '\n'; // okay: we can access the object through our const reference
    ref = 7;                  // error: we can not modify an object through a const reference

    x = 6;                // okay: x is a modifiable lvalue, we can still modify it through the original identifier
}
```

> 除非我们需要修改被引用对象的值，我们要优先使用常量左值引用
{: .prompt-info}

#### 12.4.3 Initializing an lvalue reference to const with an rvalue

我们知道，左值引用不能绑定到右值上，只能绑定给可修改的左值。然而常量左值引用却可以：

```c++
const int& ref {5};
std::cout << ref << '\n'; // prints 5
```

在这种情况下，编译器会创建一个临时变量，并用右值对该临时变量进行初始化，而常量左值引用也会绑定到这个临时变量上。

#### 12.4.4 Initializing an lvalue reference to const with a value of a different type

常量左值引用甚至可以绑定到其他类型的对象上，只要这些值可以被隐式转换到引用类型上。例如：

```c++
char c {'a'};
const int& r2 {c};
std::cout << r2 << '\n'; // prints 97
```

### 12.5 Pass by lvalue reference

此前我们讨论过按值传递，也就是传递给函数的实参会被拷贝给函数的形参。下面这段程序是按值传递传递的例子：

```c++
#include <iostream>

void printValue(int y)
{
    std::cout << y << '\n';
} // y is destroyed here

int main()
{
    int x {5};

    printValue(x);
}
```

当使用按值传递时，我们创建了一个实参值的副本，只是为了短暂地使用然后销毁。因为基础类型拷贝的成本较低，所以这不是问题。

然而，标准库所提供的绝大多数类型（比如`std::string`）都是`class`类型。`class`类的拷贝成本通常来说很高，所以我们需要尽可能避免对这些类型使用按值传递。下面就是一个糟糕的例子：

```c++
#include <iostream>

void printValue(std::string y)
{
    std::cout << y << '\n';
} // y is destroyed here

int main()
{
    std::string x {"Hello world"};

    printValue(x); // x is passed by value (copied) in to parameter y (expensive)
}
```

这段代码是相当低效的，我们有更好的实现方法。

#### 12.5.1 Pass by reference

避免对实参的高成本拷贝的一个方式是按引用传递。具体的做法是，我们将函数的形参声明为一个引用类型或常量引用类型。当按引用传递时，不会有拷贝发生。下面是一个按引用传递的例子：

```cpp
#include <iostream>
#include <string>

void printValue(std::string& y) // type changed to std::string&
{
    std::cout << y << '\n';
} // y is destroyed here

int main()
{
    std::string x { "Hello, world!" };

    printValue(x); // x is now passed by reference into reference parameter y (inexpensive)
}
```

#### 12.5.2 Pass by reference allows us to change the value of an argument

当我们使用按值传递时，函数形参得到的是实参的副本，所以在函数中对于形参值的修改，不会对实参有任何影响。

但是按引用传递时，实际上函数形参与实参本质上是同一个对象，对于形参的修改也就是对于实参的修改。例如：

```c++
#include <iostream>

void addOne(int& y) // y is bound to the actual object x
{
    ++y; // this modifies the actual object x
}

int main()
{
    int x { 5 };
    std::cout << "value = " << x << '\n';
    addOne(x);
    std::cout << "value = " << x << '\n'; // x has been modified
}
```

这段程序的结果为：

```
value = 5
value = 6
```

这个特性是至关重要的，因为某些情况下，我们需要函数能够修改参数对象本身的值。

#### 12.5.3 Pass by reference can only accept modifiable lvalue arguments

我们此前讨论过引用和常量引用的区别，所以不难推测：按引用传递只能接受可以修改的左值实参。所以对于下面这段函数，我们需要引入新的概念“按常量引用传递”：

```c++
#include <iostream>

void printValue(int& y) // y only accepts modifiable lvalues
{
    std::cout << y << '\n';
}

int main()
{
    int x { 5 };
    printValue(x); // ok: x is a modifiable lvalue

    const int z { 5 };
    printValue(z); // error: z is a non-modifiable lvalue

    printValue(5); // error: 5 is an rvalue

    return 0;
}
```

### 12.6 Pass by const lvalue reference

非常量引用只能与可修改左值绑定，而常量引用还可以额外地与不可修改左值、右值绑定。所以，如果我们将函数参数声明为常量引用类型，那么就与任何的实参绑定，例如：

```c++
#include <iostream>

void printRef(const int& y) // y is a const reference
{
	std::cout << y << '\n';
}

int main()
{
    int x {4};
    const int z {5};
    
    printRef(x); // okay
    printRef(z); // okay
    printRef(6); // okay
}
```

此外，常量引用还可以确保函数不会意外地修改参数的值。所以，除非我们有特定的理由，尽可能是要常量引用传递参数。

#### 12.6.1 Passing values of a different type to a const lvalue reference parameter

我们提到过，常量引用可以绑定到一个不同类型的对象上，只要该类型可以隐式地转换到引用的类型上。之所以这么设计，只因为这样可以允许我们用完全相同的方式将值作为参数传递给值参数或 `const` 引用参数，例如：

```c++
#include <iostream>

void printVal(double d)
{
    std::cout << d << '\n';
}

void printRef(const double& d)
{
    std::cout << d << '\n';
}

int main()
{
    printVal(5); // 5 converted to temporary double, copied to parameter d
    printRef(5); // 5 converted to temporary double, bound to parameter d
}
```

#### 12.6.2 Mixing pass by value and pass by reference

如果一个函数有多个参数，则每个参数传递的形式是互不影响的，例如：

```c++
#include <string>

void foo(int a, int& b, const std::string& c)
{
}

int main()
{
    int x { 5 };
    const std::string s { "Hello, world!" };

    foo(5, x, s);
}
```

#### 12.6.3 When to pass by (const) reference

通常来说，基础类型使用按值传递，而class或结构体类型按引用传递。

其他常见的使用按值传递的类型：枚举类型、`std::string_view`

其他常见的使用引用传递的类型：`std::string`、`std::array`、`std::vector`

#### 12.6.4 The cost of pass by value vs pass by reference

并非所有class类型都需要按引用传递，为什么呢？有两个关键点可以帮助我们理解如何选择传递参数的方式：

- 首先，拷贝对象的成本可以分为两类：

  - 对象的大小：对象占用的内存越大，拷贝所耗费的时间越长

  - 任何额外的配置都有成本：当有些class类型被实例化时，会伴随额外的配置，比如打开文件或数据库，或者分配特定大小的动态内存。当这种对象被拷贝时，也会耗费更长的时间。
  - 将引用绑定给对象的速度很快，几乎等同于拷贝基础类型所需的时间。

- 与通过正常的变量标识符访问对象相比，通过引用访问对象的成本更高一点点。对于前者，运行的程序只需要找到与变量绑定的内存地址并访问对应的值即可，而后者往往需要一个额外的步骤：程序需要先访问引用来判断当前引用绑定的是哪个对象。

现在，我们可以回答前面的问题了，为什么我们不用引用的形式传递所有参数：

- 对于拷贝成本低的对象，拷贝的成本与绑定的成本相近，这种情况下，按值传递所生成的代码会更快
- 对于拷贝成本高的对象，所以我们应该尽量避免拷贝，所以使用引用传递。

#### 12.6.5 For function parameters, prefer `std::string_view` over `const std::string&` in most cases

在C++中，一个字符串参数可能是以下三种类型之一：`std::string`、`std::string_view`，或者一个C-style的字符串。

同时我们需要了解以下几点：

- 如果实参的类型与对应形参的类型不匹配，那么编译器会尝试隐式地转换实参的类型。
- 转换一个值时，会创建目标类型的临时对象
- 创建或拷贝一个`std::string_view`类型的变量成本较低，因为`std::string_view`并不会为它正在view的string创建副本
- 创建或拷贝一个`std::string`可能会有很大的成本，因为每个`std::string`都会创建一个字符串的副本

下面这个表展示了三种类型之间相互转换的成本：

| Argument Type            | std::string_view | const std::string&                                    |
| ------------------------ | ---------------- | ----------------------------------------------------- |
| std::string              | cheap conversion | cheap reference binding                               |
| std::string_view         | cheap copy       | requires expensive explicit conversion to std::string |
| C-style string / literal | cheap conversion | expensive conversion                                  |

我们可以总结出，`std::string_view`对于所有情况来说成本都是相对较低的。

### 12.7 Introduction to pointers

我们来考虑下面这个语句：

```c++
char x {}; // chars use 1 byte of memory
```

当这个语句生成的代码被执行时，RAM上的一块内存会被指定给这个变量。比方说变量`x`的内存地址是`140`，那么当我们在表达式或语句中使用到变量`x`时，程序都会在内存地址`140`上获取到变量的值。

我们在使用变量时无需关注特定的内存地址，或者变量占用了多少内存。我们只需要通过标识符使用变量即可，编译器会替我们处理内存相关的一切。

对于引用来说也是这样，因为引用本质上只是变量`x`的一个别名，当我们使用变量`x`的引用时，程序就会在地址`140`上访问存储的值。

#### 12.7.1 The address-of operator(&)

虽然默认情况下，变量的内存地址并不会暴露出来，但是我们可以通过取址运算符来获取内存地址。具体的用法如下所示：

```c++
#include <iostream>

int main()
{
    int x {5};
    std::cout << x << '\n';  // prints 5
    std::cout << &x << '\n'; // prints memory address of x
}
```

对于占用超过一字节内存的对象，取址会返回该对象所使用的第一个字节的内存地址。

#### 12.7.2 The dereference operator (*)

仅仅获取一个变量的内存地址通常没有什么意义，而解引用运算符将给定内存地址中存储的值作为左值返回。例如：

```c++
#include <iostream>

int main()
{
    int x {5};
    std::cout << x << '\n';  // prints 5
    std::cout << &x << '\n'; // prints memory address of x
    std::cout << *(&x) << '\n'; // prints 5
}
```

#### 12.7.3 Pointers

指针是一个对象，它持有内存地址（通常是另一个变量）作为其值。这允许我们存储其他一些对象的地址以供以后使用。在现代C++中，我们在这里所讨论的指针又被称为原始指针raw pointers，从而将其与智能指针smart pointers相区别。

我们使用&来声明一个引用，对于指针来说，则需要只用`*`声明：

```c++
int; // a normal int;
int&; // a lvalue reference to an int value
int*; // a pointer to an int value (holds the address of an integer value)
```

#### 12.7.4 Pointer initialization

与普通变量一样，指针默认是不会初始化的，而没有被初始化的指针我们通常称之为野指针。野指针包含了一个垃圾地址，并且对野指针解引用会导致未被定义的行为。由此，我们务必要初始化指针。

初始化的方式如下：

```c++
int x {5};
int* ptr; // an unitialized pointer (holds a garbage address)
int* ptr2{}; // a null pointer (we'll discuss these in the next lesson)
int* ptr3 {&x}; // a pointer initialized with the address of variable x
```

一旦我们有了一个指针，我们就可以对指针进行解引用，然后获取到指针指向的地址所存储的值：

```c++
#include <iostream>

int main()
{
    int x {5};
    int* ptr {&x};
    
    std::cout << x << '\n'; // prints 5
    std::cout << *ptr << '\n'; // prints 5
}
```

我们知道，引用的类型需要与被引用对象的类型相匹配，对指针来说也是这样：

```c++
int main()
{
    int i{ 5 };
    double d{ 7.0 };

    int* iPtr{ &i };     // ok: a pointer to an int can point to an int object
    int* iPtr2 { &d };   // not okay: a pointer to an int can't point to a double object
    double* dPtr{ &d };  // ok: a pointer to a double can point to a double object
    double* dPtr2{ &i }; // not okay: a pointer to a double can't point to an int object

    return 0;
}
```

#### 12.7.5 Pointers and assignment

为指针赋值有两种方式：

- 改变指针指向的对象，也就是给指针赋值一个新的地址

  ```c++
  int x {5};
  int* ptr {&x};
  std::cout << ptr << '\n';
  
  int y {6};
  ptr = &y;
  std::cout << ptr << '\n';
  ```

  这段程序的输出结果为：

  ```
  5
  6
  ```

- 改变指针指向的值，也就是给解引用的指针赋值

  ```c++
  int x {5};
  int* ptr {&x};\
  std::cout << x << '\n';
  std::cout << ptr << '\n';
  
  *ptr = 6;
  std::cout << x << '\n';
  std::cout << ptr << '\n';
  ```

  这段程序的输出结果为：

  ```
  5
  5
  6
  6
  ```

#### 12.7.6 Pointers behave much like lvalue references

指针在很大程度上与引用类似，二者最主要的区别在于，指针对于内存地址的操作是显式的，我们显式地指定指针指向的对象，显式地解引用从而获取值。而对于引用来说，取值和解引用都是隐式的，是编译器实现的。

二者之前还有一些其他的区别：

- 引用必须被初始化，而指针不要求必须要初始化（但最好初始化）
- 引用本身并不是对象，但是指针是
- 引用不能重新绑定对象，但指针可以
- 引用必须始终与一个对象进行绑定，但指针可以不指向任何对象
- 引用是安全（悬空引用除外），指针从本质上来说是不安全的

#### 12.7.8 The size of pointers

指针的大小是固定的，不会因为指向对象的不同而不同，因为它存储的值始终是一个内存地址。唯一影响指针大小的因素是编译器运行的架构，我们可以通过sizeof来获取给定设备上指针的大小

```c++
char* chPtr{};        // chars are 1 byte
int* iPtr{};          // ints are usually 4 bytes
long double* ldPtr{}; // long doubles are usually 8 or 12 bytes

std::cout << sizeof(chPtr) << '\n'; // prints 4
std::cout << sizeof(iPtr) << '\n';  // prints 4
std::cout << sizeof(ldPtr) << '\n'; // prints 4
```

#### 12.7.9 Dangling pointers

与悬空引用类似，悬空指针所存储的内存地址是无效的。对悬空指针解引用会导致未定义行为，因为编译器会试图访问一个失效的内存地址。

下面是一个创建悬空指针的例子：

```c++
int x {5};
int* ptr {&x};

{
	int y {6};
    ptr = &y;
}

std::cout << *ptr << '\n';
```

### 12.8 Null pointers

除了内存地址，指针还可以存储一个空值。空值null value是一个特殊的值，它表示没有任何值。当指针保存一个空值时，就表示指针没有指向任何对象，我们将这样的指针称为null pointer

当我们声明一个指针而不对该指针进行初始化时，就获取了一个null pointer

```c++
int* ptr {};
```

在C++中，我们使用`true`和`false`这两个关键词来表示boolean字面值，对应地，我们可以使用`nullptr`来表示一个空指针字面值。例如，我们可以使用`nullptr`来显式地声明一个空指针

```c++
int* ptr {nullptr};
```

#### 12.8.1 Checking for null pointers

与悬空指针一样，对空指针解引用将会导致未定义行为，甚至导致程序崩溃。所以一个好的习惯是，解引用之前，要确保当前指针不是空指针

检查空指针的方式如下：

```c++
int x {5};
int* ptr {&x};

if (ptr == nullptr) // explict
    std::cout << "ptr is null\n";
else
    std::cout << "ptr is non-null\n";
    
// or
if (ptr) // implicit
    std::cout << "ptr is non-null\n";
else
    std::cout << "ptr is null\n";
```

#### 12.8.2 Use nullptr to avoid dangling pointers

C++中，我们无法检测指针是否悬空，所以我们首先需要避免在程序中出现任何悬空指针。具体的做法是将任何不指向有效对象的指针设置为`nullptr`。

这样的话，再解引用任意指针前，我们只需要判断当前指针是否是空指针即可。

#### 12.8.3 Legacy nul pointer literals: 0 and NULL

在较旧的代码中，我们可能会遇到两个其他表示空指针的字面量：`0`和`NULL`

在现代C++中，我们应该尽可能避免使用这两种字面量，我们会在后面提到具体的原因。

#### 12.8.4 Favor references over pointers whenever possible

因为引用比指针更安全，所以应该优先使用引用，除非需要指针提供的附加功能。

### 12.9 Pointer and const

我们来看下面这段程序：

```c++
int x {5};
int* ptr {&x};
int y {6};
ptr = &y;
*ptr = 7;
```

**对于正常的指针来说，我们既可以更改指针存储的内存地址，也可以修改指针所存储的内存地址所保存的值。**

那如果变量是const呢？例如：

```c++
const int x {5};
int* ptr {&x};
```

当我们尝试运行上面这两个语句时，将会得到报错：

```
cannot convert from int* to int*
```

也就是说，我们不能让一个正常的指针指向一个const变量。

#### 12.9.1 Pointer to const value

为了声明一个指向常量的指针，需要在指针数据类型前添加`const`关键字：

```c++
const int x {5};
const int* ptr {&x};
```

需要注意的是，指向常量的指针本身并非常量，也就是说，指向常量的指针可以指向一个新的内存地址：

```c++
const int x {5};
const int y {6};
const int *ptr {&x};
ptr = &y;
```

与常量引用类似，指向常量的指针也可以指向一个非常量的值，但仍会将指向的对象视为常量：

```c++
int x {5};
const int& ptr {&x};

*ptr = 6; // not allowed
x = 6; // okay
```

#### 12.9.2 Const pointers

当然，我们可以让指针本身是一个常量，也就是const pointer，常量指针当被声明并初始化后，就无法修改指向的对象了。

想要声明一个常量指针，我们将`const`关键字放在`*`号后面：

```c++
int x {5};
int y {6};
int* const ptr {&x};
ptr = &y; // not-allowed，since ptr is const pointer
```

然而，由于常量指针指向的对象是非常量的，我们仍然可以通过解引用来修改指向对象的值：

```c++
int x {5};
int* const ptr {&x};
*ptr = 6'
```

#### 12.9.3 Const pointer to a const value

最后，还存在指向常量的常量指针，这种指针唯一的作用就是通过解引用访问变量的值

```c++
int x {5};
const int* const ptr = {&x};
```

### 12.10 Pass dy address

此前，我们已经了解过两种传递参数的方式了：按值传递与按引用传递。我们可以通过下面这个程序来回顾一下：

```c++
#include <iostream>
#include <string>

void printByValue(std::string val)
{
    std::cout << val << '\n';
}

void printByReference(const std::string& ref)
{
    std::cout << ref << '\n';
}

int main()
{
    std::string str {"Hello Renderer"};
    printByValue(str);
    printByReference(str);
}
```

但不管是哪种方式，我们没有将实际的对象`str`作为实参传递给函数调用。

#### 12.10.1 Pass by address

C++提供了第三种传递参数的方式：按地址传递，也就是我们通过指针，将对象的内存地址作为参数传递，而函数形参会接受指针的拷贝，并通过解引用来访问实际的对象。下面是一个例子：

```c++
#include <iostream>
#include <string>

void printByAddress(const std::string* ptr)
{
    std::cout << *ptr << '\n';
}

int main()
{
    std::string str {"Hello Renderer"};
    std::string* ptr = {&str};
    printByAddress(ptr);
}
```

#### 12.10.2 Pass by address does not make a copy of the object being pointed to

我们之前提到过，`std::string`的拷贝成本较高，但是当我们使用地址来传递`std::string`时，就可以避免拷贝实际的`std::string`对象。我们只是拷贝了保存了内存地址的指针，由于指针的大小只有八字节或四字节，所以拷贝指针的速度相当快。

也就是说，和按引用传递一样，使用地址传递同样快速，且可以避免拷贝实际的对象

#### 12.10.3 Pass by address allows the function to modify the argument's value

和按引用传递，按地址传递可以允许函数修改实参的值：

```c++
#include <iostream>

void changeValue(int* ptr)
{
    *ptr = 6;
}

int main()
{
    int x {5};
    int* ptr = {&x};
    changeValue(ptr);
    std::cout << x << '\n'; // prints 6
}
```

如果我们不希望函数可以修改实参的值，则函数的形参应该是一个指向常量的指针：

```c++
void dontChangeValue(const int* ptr)
{
	*prt = 6; // error
}
```

#### 12.10.4 Null checking

当我们通过地址传递参数时，在解引用之前，我们需要确保指针是非空指针

#### 12.10.5 Prefer pass by (const) reference

相较于按地址传递，按引用传递有一些优势：

首先，因为右值没有地址，当使用地址传递时，参数只能是左值，相比之下，按引用传递会更灵活一些。

其次，按引用传递的语法要更自然一些，我们只需要传入字面量与对象即可，而使用地址传递时，代码内会遍布`&`与`*`，一定程度上影响代码可读性。

最后，使用引用传递会更安全一些。

#### 12.10.6 Pass by address for "optional" arguments

按地址传递最常见的用途之一是允许函数接受一个可选的实参，我们来看下面这个例子：

```c++
#include <iostream>

void printIDNumber(const int* id = nullptr)
{
    if (id)
        std::cout << "Your ID number is " << *id << '\n';
    else
        std::cout << "Your ID number is unknown\n";
}

int main()
{
    int userID {34};
    printIDNumber();
    printIDNumber(&userID);
}
```

只是，这种情况下我们也可选择函数重载作为一种更安全且更灵活的实现方案。更灵活是因为我们可以使用字面量或右值作为参数，这对于指针来说是不可行的。

#### 12.10.7 Changing what a pointer parameter points at

当我们将一个内存地址作为参数传递时，这个地址会从实参拷贝到形参中（这没问题，因为拷贝指针的速度很快）。

那么让我们考虑一下下面这个程序：

```c++
#include <iostream>

[[maybe_unused]]
void nullify(int* ptr2)
{
    ptr2 = nullptr;
}

int main()
{
    int x {5};
    int* ptr {&x};

    nullify(ptr);
    std::cout << "prt is " << (ptr ? "non-null\n" : "null\n");
}
```

运行这个程序，我们会发现`ptr`仍然会指向变量`x`，因为`nullify()`中所修改的只是实参地址的拷贝，反而实参地址本身。那么我们如何在函数中更改作为参数的指针所指向的对象呢？

#### 12.10.8 Pass by address by reference

我们的做法是，传递指针的引用，也就是：

```c++
#include <iostream>

void nullify(int*& refptr) // refptr is now a reference to a pointer
{
    refptr = nullptr; // Make the function parameter a null pointer
}

int main()
{
    int x{ 5 };
    int* ptr{ &x }; // ptr points to x

    std::cout << "ptr is " << (ptr ? "non-null\n" : "null\n");

    nullify(ptr);

    std::cout << "ptr is " << (ptr ? "non-null\n" : "null\n");
    return 0;
}
```

#### 12.10.9 Why using `0` or `NULL` is no longer preferred

我们之前提到过，0和NULL也可以作为表示空指针的字面量，但是在现在C++中，并不推荐这二者的使用。

首先，字面量`0`既可以被解释为一个整数字面量，也可以被解释为零指针字面量。在特定的情况下，这会带来一定的误导性

而预处理器宏NULL则并非由C++标准定义的，它可能会被定义为`0`、`0L`或者`((void*))0`

我们来看一个具体的例子：

```c++
#include <iostream>
#include <cstddef> // for NULL

void print(int x) // this function accepts an integer
{
    std::cout << "print(int): " << x << '\n';
}

void print(int* ptr) // this function accepts an integer pointer
{
    std::cout << "print(int*) " << (ptr ? "non-null\n" : "null\n");
}

int main()
{
    int x {5};
    int* ptr {&x};
}
```

### 12.12 Return by reference and return by address

某些情况下，将函数的返回值拷贝给函数调用也可能会有较大的成本，例如：

```c++
std::string returnByValue(); // returns a copy of a std::string (expensive)
```

#### 12.12.1 Return by reference

对于上述的问题，我们的一个解决方案是，按引用返回，这样就避免了对于返回值的拷贝。具体的做法是，将函数的返回值定义为一个引用类型：

```c++
std::string& returnByReference();
```

或者返回一个常量引用：

```c++
const std::string& returnByReferenceToConst();
```

下面是一个具体的例子：

```c++
#include <iostream>
#include <string>

const std::string& getProgramName()
{
    static const std::string prorgramName {"Calculator"};
    return prorgramName;
}

int main()
{
	std::cout << "This program is named " << getProgramName();
}
```

在第六行中，我们使用了static关键字，从而表面该变量会在程序结束时销毁

#### 12.12.2 The object being returned by reference must exist after the function returns

还是以上面的程序为例，如果我们删去`static`关键字，则`programName`就会变成一个local变量，对应地，函数所返回的引用就就会变成悬空引用，从而会导致未被定义的行为。

#### 12.12.3 Don't return non-const

还是上面的程序，我们返回的是一个常量静态变量的引用，我们需要注意的是**，尽量避免返回一个非常量静态变量的引用**。我们考虑下面这个例子，然后分析一下其中可能会出现的问题：

```c++
#include <iostream>
#include <string>

const int& getNextID()
{
    static int s {0};
    ++s;
    return s;
}

int main()
{
    const int& id1 {getNextID()};
    const int& id2 {getNextID()};

    std::cout << id1 << id2 << '\n';
}
```

该程序返回的结果是：

```
22
```

出现这样的结果的原因是，id1和id2都是同一个变量的引用，所以只有当该变量被修改，所有的引用也会被修改。

#### 12.12.4 Assigning/initializing a normal variable with a returned reference makes a copy

如果函数返回了引用，并且该引用被用来赋值或初始化一个非引用变量，则返回值会被拷贝。我们可以结合下面这个例子：

```c++
#include <iostream>
#include <string>

const int& getNextID()
{
    static int s {0};
    ++s;
    return s;
}

int main()
{
    const int id1 {getNextID()};
    const int id2 {getNextID()};

    std::cout << id1 << id2 << '\n';
}
```

在这个示例中，函数`getNextID()`返回了一个引用，但是变量id1和id2都不是引用，这种情况下，返回的引用中的值会拷贝到正常的变量中，所以这段程序最终的结果是：

```c++
12
```

值得一提的是，如果程序返回的是悬空引用，拷贝悬空引用中的值将会导致未被定义的行为，例如:

```c++
#include <iostream>
#include <string>

const std::string& getProgramName()
{
    const std::string programName {"Hi"};
    return programName;
}

int main()
{
    std::string name {getProgramName()}; // makes a copy of dangling reference
    std::cout << name << '\n';
}
```

#### 12.12.5 It's okay to return reference parameter by reference

有很多情况下都适合使用引用作为返回类型，我们后续会遇到很多这样的例子。但是我们现在可以先来介绍一个。

如果一个参数通过引用传递给函数，那么通过引用返回这个参数是安全的。这是有道理的：为了将参数传递给函数，参数必须存在于调用者的作用域中。当被调用的函数返回时，该对象仍必须存在于调用者的作用域中。我们来看一个例子：

```c++
#include <iostream>
#include <string>

const std::string& firstAlphabetical(const std::string& a, const std::string& b)
{
    return (a < b) ? a : b;
}

int main()
{
    std::string hello {"hello"};
    std::string world {"world"};
    std::cout << firstAlphabetical(hello, world) << '\n';
}
```

#### 12.12.6 Return by address

在C++中，函数可以通过返回对象的引用或者对象的地址来返回一个对象。两者虽然在实现细节上有些不同，但在许多情况下功能相似。下面是返回地址和返回引用的详细对比。

**返回引用**

- 返回引用时，函数返回的是对象的引用（reference）。调用者使用返回的引用时，可以直接操作该对象。
- 使用返回引用时，必须确保返回的对象在函数返回后仍然有效，否则会导致悬空引用（dangling reference）。

**返回地址**

- 返回地址时，函数返回的是对象的指针（pointer）。调用者使用返回的指针时，可以通过指针访问和操作该对象。
- 使用返回地址时，同样必须确保返回的对象在函数返回后仍然有效，否则会导致悬空指针（dangling pointer）。

返回地址的优势和劣势

**优势**

- **可以返回`nullptr`**：返回地址最大的优势是可以在没有找到有效对象时返回`nullptr`。例如，在一个学生列表中搜索特定学生时，如果找到匹配的学生，可以返回指向该学生对象的指针。如果没有找到匹配的学生，可以返回`nullptr`，表示没有找到匹配的对象。

- **需要检查`nullptr`**：使用返回地址时，调用者必须在解引用指针前检查是否为`nullptr`。如果没有进行检查而直接解引用`nullptr`，将导致未定义行为（undefined behavior），可能会导致程序崩溃或其他不可预知的问题。

### 12.13 In and out parameters

#### 12.13.1 In parameters

输入参数是传递给函数的值，函数只读取这些值，而不会对其进行修改。通常情况下，输入参数通过值传递（pass by value）或常量引用传递（pass by constant reference）。

```c++
void printValue(const int& value) {
    std::cout << value << '\n';
}
```

#### 12.13.2 Out parameters

输出参数是传递给函数的值，函数会修改这些值并返回给调用者。输出参数通常通过指针或引用传递，以便函数能够直接修改调用者提供的变量。

```c++
void getNextValue(int& result)
{
	static int value = 0;
	result = ++value;
}
```

#### 12.13.3 Out parameters have an unnatural syntax

输出参数虽然有用，但是也有一些劣势。

首先，函数调用必须实例化并初始化对象，并将对象作为实参传递。并且这些对象要能够被赋值，这意味它们不能是`const`变量。

其次，因为函数调用必须传递对象，所以我们既不能使用临时值，也不能使用简单的单一表达式。

我们可以通过下面这个示例程序来进一步理解：

```c++
#include <iostream>

int getByValue()
{
	return 5;
}

void getByReference(int& x)
{
    x = 5;
}

int main()
{
    // return by value
    int x {getByValue()}; // can use to initializa object
    std::cout << getByValue() << '\n'; // can use teporary return value in expression
    
    // return by out parameter
    int y {}; // must first allocate an assignable object
    getByReference(y); // then pass to function to assign the desired value
    std::cout << y << '\n'; // and only then can we use that value
}
```

可以看出，输出参数的使用语法相对来说没有那么自然。

#### 12.13.4 Out-parameters by reference don't make it obvious the arguments will be modified

当我们用一个函数的返回值为一个对象赋值时，很明显这个对象的值会被修改，例如：

```c++
x = getByValue();
```

但是，对于通过引用传递的输出参数来说，当函数被调用时，我们很难看出一个参数是输入参数还是输出参数，也就不容易直观地判断该参数是否会被修改。例如：

```c++
void getSinCos(double degrees, double& sinOut, double$ cosOut)
{
	constexpr double pi { 3.14159265358979323846 }; 
    double radians = degrees * pi / 180.0;
    sinOut = std::sin(radians);
    cosOut = std::cos(radians);
}

int main()
{
    double sin { 0.0 };
    double cos { 0.0 };

    double degrees{};
    std::cout << "Enter the number of degrees: ";
    std::cin >> degrees;

    // getSinCos will return the sin and cos in variables sin and cos
    getSinCos(degrees, sin, cos);

    std::cout << "The sin is " << sin << '\n';
    std::cout << "The cos is " << cos << '\n';
}
```

这种情况下，使用地址传递会在一定程度上让输出参数更显而易见，因为函数调用中需要获取作为实参的对象的地址。我们考虑下面这个程序：

```c++
void foo1(int x);  // pass by value
void foo2(int& x); // pass by reference
void foo3(int* x); // pass by address

int main()
{
    int i {};
    
    foo1(i); // can't modify i
    foo2(i); // can modify i, but not abvious
    foo3(&i); // clearly can modify i
    
    int *ptr {&i};
    foo3(ptr); // can modify i, but not abvious
}
```

在函数调用中，`foo3(&i)`中的取址符很明显地告诉我们可能会修改作为实参的对象。但使用地址传递也并非万无一失，比如函数调用`foo3(ptr)`就同样不明显。

**所以，让我们总结一下，出于以下原因，我们应该尽量避免使用输出参数：**

1. **代码可读性和可维护性：**
   - 输出参数通常通过引用或指针传递，容易让代码变得复杂和难以理解。
   - 调用者需要检查并理解哪些参数会被修改，这增加了理解和维护代码的难度。
2. **潜在的错误**：
   - 如果调用者忘记初始化输出参数，或者传递了不正确的参数类型，可能导致未定义行为。
   - 在使用指针作为输出参数时，可能会出现空指针解引用的风险。
3. **函数接口不明确**：
   - 输出参数使得函数的接口不够明确，因为调用者必须知道哪些参数是输入的，哪些是输出的。

#### 12.13.5 In/out parameters

in-out参数（输入/输出参数）是既用于传递给函数输入值，又用于接收函数计算结果的参数。函数在处理这些参数时，会读取它们的初始值并进行某些操作，然后将操作后的结果存回这些参数中。

#### 12.13.6 When to pass by non-const reference

如果是出于避免拷贝实参的目的而使用引用传递，那么在绝大多数情况下，我们应该使用常量引用。

但是，也有两种情况使用非常量引用是更好的选择。

首先，当形参是一个in-out参数时，使用非常量引用进行传递。对于in-out参数，我们不仅需要读取值，还会修改值，所以需要使用非常量引用。例如：

```c++
void doModify(Foo& inout)
{
    // modify inout
}

int main()
{
    Foo foo{};
    doModify(foo); 
}
```

这种情况下，我们可以先通过值或者常量引用传递对象，然后通过值返回一个新的对象，继而被函数调用用于赋值：

```c++
Foo someFcn(const Foo& in)
{
    Foo foo { in }; // copy here
    // modify foo
    return foo;
}

int main()
{
    Foo foo{};
    foo = someFcn(foo); // makes it obvious foo is modified, but another copy made here
}
```

虽然多了两次额外拷贝的成本（有时候编译器会优化其中一个拷贝），但是从语法上更好理解。

还有一种情况最好使用飞常量引用传递。即当一个函数会向调用者按值返回一个对象，但复制该对象非常昂贵时，尤其是在性能关键代码部分中多次调用该函数时，例如：

```c++
void generateExpensiveFoo(Foo& out)
{
	// modify out
}

int main()
{
    Foo foo {};
    generateExpensiveFoo(foo);
}
```

---

### 12.14 Type decuction with pointers, references, and const

在之前的内容中，我们讨论过`auto`关键字如何让编译器从初始化中推导出变量的类型。

我们也提到过，默认情况下，类型推导会丢弃掉`const`与`constexpr`修饰符。想要保证`const`或`constexpr`不被丢弃，可以为`auto`关键字添加对应的修饰符。

#### 12.14.1 Type deduction drops references

除了会丢弃掉const与constexpr，类型推导同样会丢弃引用：

```c++
#include <iostream>

std::string& getRef();

int main()
{
    auto ref {getRef();}
}
```

虽然函数getRef()返回的是`std::string&`，但ref推导得到的类型是`std::string`

类似的，如果想要保留引用类型，就需要在定义变量时明确是引用类型，例如：

```c++
auto& ref {getRef()};
```

#### 12.14.2 Top-level const and low-level const

C++中，`const`关键词可以用来限定变量、指针或引用。而根据`const`在类型中的位置，可以分为顶层`const`与底层`const`。

顶层`const`用于描述变量**本身**是常量，这意味着一旦变量初始化，就不能被修改了。顶层`const`可以应用于任何对象。

底层`const`用于描述指针或引用所指向的对象是常量。这意味着通过该指针或引用不能修改所指向的对象的值。底层`const`应用于指针或引用的类型。

下面是一些具体的例子：

```c++
const int x = 42; // top level，表示x本身是常量，不能被修改
const int* ptr1 = &x; // low level，表示prt1是指向const int的指针，prt1所指向的对象是常量
int* const ptr2 = &y; // top level，表示ptr2是一个常量指针，prt2本身是常量，不能指向其他地址
const int* const ptr3 = &x; // ptr3 是一个指向 const int 的常量指针，表示 ptr3 本身是常量（顶层const），且 ptr3 所指向的对象是常量（底层const）
```

当我们使用类型推导时，顶层`const`通常会被忽略，而底层`const`在类型推导中会被保留。

#### 12.14.3 Type deduction and const references

当使用`auto`进行类型推导时，如果初始化是一个指向`const`或`constexpr`的引用，那么类型推导的过程中，会先去除引用类型（如果适用，还会重新应用引用），然后去除顶层`const`或`constexpr`

这样可以确保在类型推导过程中，得到的类型是适当的基本类型，而不是受限的常量或引用类型，例如：

```c++
const int& ref = 42;
auto value = ref; // value的类型是int
```

#### 12.14.4 Type deduction and pointers

与引用不同的是，类型推导并不会丢弃指针：

```c++
#include <string>

std::string* getPtr();

int main()
{
	auto ptr1 {getPtr()}; // std::string*
}
```

我们也可以将*与类型推导结合使用：

```c++
#include <string>

std::string* getPtr();

int main()
{
	auto ptr1 {getPtr()}; // std::string*
    auto* ptr2 {getPtr()}; // std::string*
}
```

#### 12.14.5 The difference between auto and auto

**`auto` 推导值类型**：

- `auto`会根据初始化表达式的类型进行类型推导，忽略顶层`const`和引用。
- 例如，`auto y = x;`会将`y`的类型推导为`int`，即使`x`是`const int`。

**`auto*` 推导指针类型**：

- `auto*`会根据初始化表达式的类型推导出指针类型。
- 例如，`auto* q = p;`会将`q`的类型推导为指向`p`所指向类型的指针。

---

### 12.5  std::optional

首先我们考虑下面这个函数：

```c++
int doubleDivision(int x, int y)
{
	return x / y;
}
```

如果在函数调用时，我们传递了在语法上错误的参数，如`y = 0`，那么函数就无法计算要返回的值。要如何处理这种情况呢？ 此时，我们应该让函数检测错误，然后将错误返回给函数调用。

此前，我们接触到了两种让函数将错误返回给函数调用的方法：

- 如果函数本来返回void，则修改为返回布尔值
- 如果函数本来返回一个值，则修改函数，使得当错误发生时，返回一个本不可能返回的值。我们将这个值称为Sentinel Value。

下面是一个第二种方法的例子：

```c++
#include <iostream>

double reciprocal(double x)
{
    if (x == 0.0)
        return 0.0; // return 0.0 as a sentinel to indicate an error occurred
    return 1.0 / x;
}

void testReciprocal(double d)
{
     double result { reciprocal(d) };
     std::cout << "The reciprocal of " << d << " is ";
     if (result != 0.0)
         std::cout << result << '\n';
     else
         std::cout << "undefined\n";
}

int main()
{
    testReciprocal(5.0);
    testReciprocal(-4.0);
    testReciprocal(0.0);
}
```

这种解决方案看似有效，但是存在一些潜在的问题：

- 开发者必须知道用于表示函数发生错误的sentinel value。
- 同一个函数的不同版本也可能会有不同的sentinel value。
- 这种方法不适用于所有sentinel value都是函数合理的返回值的情况。

比方说，对于前面所提到的函数`doIntDivision()`，显然我们不能使用0，因为0除以任意值都会得到0。事实上，我们可以返回的值没有任何不能自然发生的。那我们要如何解决呢？

首先，我们或许可以选择一些不常见的返回值作为sentinel value，例如：

```c++
#include <limits>

int doIntDivision(int x, int y)
{
    if (y == 0)
        return std::numeric_limits<int>::lowest();
    return x / y;
}
```

这种方法是有效的，但是仍有两个主要的缺点：

- 每次调用函数时，我们都需要将函数的返回值与`std::numeric_limits<int>::lowest()`进行对比，这种的做法相对冗长且不美观
- 如果在某个特定情况下，函数调用为`doIntDivision(std::numeric_limits<int>::lowest(), 1)`，那么我们就无法得知函数是否有错误。

#### Returning a `std::optional`

`std::optional` 是 C++17 标准库中引入的一个模板类，用于表示一个可能包含值也可能不包含值的对象。它在处理函数可能不返回有效值的情况下特别有用，可以避免使用指针或特殊返回值（如`nullptr` 或错误代码）。

比如下面这个例子：

```c++
#include <iostream>
#include <optional>

std::optional<int> dotIntDivision(int x, int y)
{
    if (y == 0)
        return {}; // or return std::nullopt
    return x / y;
}

int main()
{
    std::optional<int> result {dotIntDivision(20, 5)};
    if (result) // if the functino return a value
        std::cout << "Result is " << *result << '\n'; // get the value
    else
        std::cout << "Result failed" << '\n';
}
```

使用`std::optional`是很简单的，我们可以构建一个带有值或者不带有值的`std::optional<T>`：

```c++
std::optional<int> o1 { 5 };            // initialize with a value
std::optional<int> o2 {};               // initialize with no value
std::optional<int> o3 { std::nullopt }; // initialize with no value
```

判断一个`std::optional`是否有值的方法是：

```c++
if (o1, has_value())
// or
if (o2)
```

获取`std::optional`的值的方法可以选择下面任意一种：

```c++
std::cout << *o1;
std::cout << o2.value();
std::cout << o3.value_or(42); // 如果o3有值，则返回其值，否则返回42
```

需要注意的是，std::optional的使用语法本质上与指针相同。

#### Cons of returning a `std::optional`

虽然`std::optional`提供了一些便利，但是也有缺点：

- 在获取`std::optional`的值之前，我们需要确保`std::optional`是包含值的，否则会导致未被定义的行为
- `std::optional`不能提供为什么函数会失败的相关信息。

#### Using std::optional as an optional function parameter

此前，我们提到过可以通过指针来允许函数接收一个可选的实参，也就是：

```c++
#include <iostream>

void printIDNumber(const int *id=nullptr)
{
    if (id)
        std::cout << "Your ID number is " << *id << ".\n";
    else
        std::cout << "Your ID number is not known.\n";
}

int main()
{
    printIDNumber(); // we don't know the user's ID yet

    int userid { 34 };
    printIDNumber(&userid); // we know the user's ID now
}
```

我们也可以用`std::optional`表示一个可选的参数：

```c++
#include <iostream>
#include <optional>

void printIDNumber(std::optional<const int> id = std::nullopt)
{
    if (id)
        std::cout << "Your ID number is " << *id << ".\n";
    else
        std::cout << "Your ID number is not known.\n";
}

int main()
{
    printIDNumber(); // we don't know the user's ID yet

    int userid { 34 };
    printIDNumber(userid); // we know the user's ID now

    printIDNumber(62); // we can also pass an rvalue
}
```

使用`std::optional`来表示可选的参数具有两个优势：

- 明确表明了该参数是可选的
- 可以传递右值，因为`std::optional`会拷贝参数

