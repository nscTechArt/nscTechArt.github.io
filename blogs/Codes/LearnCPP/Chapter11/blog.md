---
layout: page
permalink: /blogs/Codes/LearnCPP/Chapter11/index.html
title: Function Overloading and Function Templates
---

### Function Overloading and Function Templates

---

#### 11.1 Introduction to function overloading

考虑下面这个函数：

```c++
int add(int x, int y)
{
	return x + y;
}
```

这个函数将两个整数相加并返回一个整数结果。但是，如果我们还想要一个可以添加两个浮点数的函数呢？这个 add()函数不合适，因为任何浮点参数都会转换为整数，从而导致浮点参数丢失其小数值。我们可以通过定义一个函数名称类似的新函数来实现这个功能。

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

但是这样可能会让代码变得十分繁重，所以我们引入了函数重载的概念。C++允许我们创建多个函数命名相同的函数，每个同名函数有不同的参数类型，这也是编译器区分同名函数的依据。我们可以将上面的一段的代码使用函数重载的方法优化：

```c++
int add(int x, int y)
{
	return x + y;
}

double add(double x, double y)
{
	return x + y;
}
```

> 操作符也可以重载

此外，当对已经重载的函数进行函数调用时，编译器将尝试根据函数调用中使用的参数将函数调用与相应的重载相匹配，我们称之为**overload resolution**。下面是一段直观的解释：

```c++
#include <iostream>

int add(int x, int y)
{
	return x + y;
}

double add(double x, double y)
{
	return x + y;
}

int main()
{
	std::cout << add(1, 2); // calls add(int, int);
	std::cout << '\n';
    std::cout << add(1.2, 3.4); // calls add(double, double)
    
    return 0;
}
```

想要让使用了函数重载的程序进行编译，必须要满足以下两点：

- 每个重载函数都必须要与其他重载函数区分开。
- 每一个重载函数的调用都必须有且一个对应的resolution。

---

#### 11. 2 Function overload differentiation

我们已经初步了解了函数重载的基本概念，现在我们来考虑一下重载函数之间是如何区分开来的。区分重载函数的依据有两个：**参数的数量**和**参数的类型**，其中参数类型不包括typedefs，type aliaes，const修饰符。请注意，**函数的返回类型不能作为区分重载函数的依据**

首先我们来看依据参数数量进行区分，也就是说，只要每个重载函数有不同的参数个数，就会被区分开。下面这段代码中的两个重载函数，就可以被编译器进行区分：

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

如果重载函数的参数类型的列表不同，重载函数就可以区分开。下面这段代码中，每个重载函数都是可以相互区分的。

```c++
int add(int x, int y);
double add(double x, double y);
double add(int x, double y);
double add(double x, int y);
```

此外，typedef和type alias并不会是重载函数区分开，下面代码中的重载函数是不能区分的：

```c++
typedef int Height;
using Age = int;

void print(int value);
void print(Age value);
void print(Height value);
```

const也同样不能实现区分：

```c++
void print(int);
void print(const int);
```

虽然我们还没有讲到省略号，但是省略号确实可以作为重载函数的区分依据，比如下面这段代码：

```c++
void foo(int x, int y);
void foo(int x, ...); // differentiated from foo(int, int)
```

在区分重载函数时，不考虑函数的返回类型。我们考虑这种情况：实现一个返回随机数的函数，但是我们需要一个返回int的版本，还需要一个返回double的版本，但是下面这段代码是无法编译通过的:

```c++
int randomValue();
double randomValue();
```

试想：当编译器看到函数`randomValue()`时，并没有任何可以帮助区分重载函数的依据。实际上，这种设计方式是合理的，我们总是可以仅根据函数调用中的参数来确定将调用哪个版本的函数。如果返回值用于区分，那么我们将没有一个简单的语法方法来判断调用函数的哪个重载 - 我们还必须了解返回值是如何使用的，这需要更多的分析。所以，解决问题的方式就是为函数创建不同的名称：

```c++
int randomInt();
double randomDouble();
```

此外，我们再来了解一下函数签名**type signature**。C++中，函数签名包括函数名称，参数数量，参数类型，以及函数的限定符。请注意，函数签名并不包含函数的返回类型。

---

#### 11.3 Function overload resolution and ambiguous matches

我们已经讨论了重载函数之间是如何通过参数来区分的，对于函数重载，编译器除了需要能够区分函数，还需要确保在调用时可以找到匹配的函数声明。

对于非重载函数来说，只有一个函数可以潜在地与函数调用匹配，这样的函数只有匹配和不匹配两种结果。但是使用重载函数时，可能有许多函数可能与函数调用匹配。由于函数调用只能解析为其中之一，因此编译器必须确定哪个重载函数最匹配。将函数调用与特定重载函数匹配的过程称为**overload resolution重载解析**

考虑这种情况：函数调用中的参数类型任何一个重载函数都不完全匹配，会怎么样呢？例如下面这段代码：

```c++
#include <iostream>

void print(int x)
{
	std::cout << x << '\n';
}

void print(double d)
{
	std::cout << d << '\n';
}

int main()
{
	print('a');  // char does not match int or double
	print(5L);   // long does not match int or double
}
```

不完全匹配意味着并非找不到匹配项，毕竟`char`或者`long`都可以转换为`int`或者`double`，但是哪种转换是最好的呢？下面我们就要探讨一下编译器如何将给定的函数调用与特定的重载函数匹配。

当对重载函数进行函数调用时，编译器会逐步执行一系列规则，以确定哪个（如果有）重载函数最匹配。每个步骤中，编译器都会对函数调用中的参数应用一堆不同的类型转换。对于每个转换，编译器都会检查是否有任何重载函数匹配。在应用并检查所有不同的类型转换是否匹配后，步骤就算是完成了。以下是三种可能的结果：

- 没有找到匹配的函数。编译器会执行下一个步骤。
- 找到了一个匹配的函数，这个函数会被认为是最匹配的，这样匹配的进程就结束了，后续步骤不再被执行。
- 有超过一个的匹配的函数，编译器会发出**ambiguous matches**的报错。

如果编译器在到达序列末尾时没有找到匹配项，也会发生编译错误。

现在我们来看看这个匹配序列具体是怎样的

##### 第一步：

编译器会试着寻找一个完美的匹配函数，这分为两步进行，首先编译器将查看是否存在一个重载函数，其中函数调用中的参数类型与重载函数中的参数类型完全匹配，例如：

```c++
void print(int)
{
}

void print(double)
{
}

int main()
{
	print(0); // exact match
	print(3.4); // exact match
}
```

然后，编译器会对函数调用中的参数进行一些简单的转换**trivial conversions**。trivial conversions是一组特定的转换规则，这些规则将会修改类型以查找匹配项。例如，可以很容易地将非常量类型转换为常量类型：

```c++
void print(const int)
{}

void print(double)
{}

int main()
{
	int x {0};
	print(x); // x trivially converted to const int
	
	return 0;
}
```

在这个例子中，我们调用了print(x)，其中的`x`为`int`类型，但是编译器会轻松地将其转换为`const int`。通过**trivial conversions**进行的匹配也会被视为完美匹配。

##### 第二步：

如果没有完美匹配的函数，编译器就会试着查找可以通过对参数执行numberic promotion来实现匹配的函数，如果成功地找到了相匹配的函数，那本次函数调用也就得到了重载解析。以下面这段代码为例：

```c++
void print(int)
{
}

void print(double)
{
}

int main()
{
	print('a'); // promoted to match print(int)
	print(true); // promoted to match print(int)
	print(4.5f); // promoted to match print(double)
    
    return 0;
}
```

##### 第三步：

如果经过numberic promotion也没有得到一个匹配的函数，那编译器就会试着通过numberic conversion来寻找匹配。例如：

```c++
#include <string> // for std::string

void print(double)
{
}

void print(std::string)
{
}

int main()
{
	print('a') // 'a' converted to match print(double)
	
	return 0;
}
```

在这段代码中，`print('a')`的调用没有完美匹配print(char)，也无法进行numberic promotion来匹配`print(int)`，所以参数'a'就会通过numberic conversion转换为`double`，从而匹配`print(double)`

##### 第四步：

如果无法通过numberic conversion实现匹配，编译器将会尝试通过任何用户自定义的转换找到匹配的重载函数。虽然我们目前还没有探讨过user-defined conversions，但某些类型（例如类）可以定义到可以隐式调用的其他类型的转换。这里是一个近作说明用的例子：

```c++
class X
{
public:
	operator int() {return 0;} // Here's a user-defined conversion from x to int
};

void print(int)
{
}

void print(double)
{
}

int main()
{
	X x;
	print(x);
	
	return 0;
}
```

在这个例子中，编译器会按照我们前几步依次寻找恰当的匹配，很显然都会失败，所以编译器会试着查找任何可能的用户自定义的转换。

##### 第五步：

如果第四步也没有结果，编译器就会查找使用省略号的匹配的重载函数。

##### 第六步：

编译器会放弃查找，并报错

现在，我们再来重新看看**ambiguous match**的概念。对于非重载函数来说，每次函数调用要么有对应的函数解析，要么会找不到匹配项，同时编译器也会报错。但是对于重载函数来说，还会有第三个选项，也就是ambiguous match。

由于必须将重载函数之间区分开才可以编译，那当函数调用存在多个匹配项时会怎样呢？考虑下面这个例子：

```c++
void print(int)
{
}

void print(double)
{
}

int main()
{
    print(5L); // 5L is type long

    return 0;
}
```

我们按照前面提到的一系列步骤分析。没有完美匹配，long也不可以`numberic promotion`。然而，对long执行numberic conversion可以得到int，也可以得到double，这两种情况都有可以匹配的重载函数，所以我们的匹配是模棱两可的。下面是另一个会导致不明确匹配的例子：

```c++
void print(unsigned int)
{
}

void print(float)
{
}

int main()
{
    print(0); // int can be numerically converted to unsigned int or to float
    print(3.14159); // double can be numerically converted to unsigned int or to float

    return 0;
}
```

因为不明确的匹配属于编译时的错误，所以我们应该在编译前就解决这个问题。下面是几种方法：

- 最简单的方法是直接定义一个可以完美匹配的新的重载函数。

- 显式地强制转换不明确的参数，从而匹配要调用的函数的类型，以前面的那段代码为例

  ```c++
  int x {0};
  print(static_cast<unsigned int>(x)); // will call print(unsigned int)
  ```

- 如果参数是文本literal，则可以使用文本后缀来确保将文本解释为正确的类型：

  ```c++
  print(0u); // will call print(unsigned int) since 'u' suffix is unsigned int, so this is now an exact match
  ```

当函数调用有多个参数时，编译器则会将匹配规则依次应用在每个参数上。最终，成功匹配的函数必须为至少一个参数提供比所有其他候选函数更好的匹配，并且对于所有其他参数的匹配度不得更差。下面是一个例子：

```c++
#include <iostream>

void print(char, int)
{
	std::cout << 'a' << '\n';
}

void print(char, double)
{
	std::cout << 'b' << '\n';
}

void print(char, float)
{
	std::cout << 'c' << '\n';
}

int main()
{
	print('x', 'a');

	return 0;
}
```

在这段程序中，所有的重载函数的第一个参数都与函数调用的第一个参数相匹配，但是`char`是可以通过numberic promotion转换为`int`的，`float`和`double`却需要numberic conversion。所以编译器会选择调用第一个重载函数。

---

#### 11.4 Deleting functions

我们首先来考虑下面这个例子：

```c++
#include <iosstream>

void printInt(int x)
{
	std::cout << x << '\n';
}

int main()
{
	printInt(5);    // okay: prints 5
    printInt('a');  // prints 97 -- does this make sense?
    printInt(true); // print 1 -- does this make sense?
}
```

这段代码的输出结果如下：

```c++
5
97
1
```

`'a'`和`true`会通过numberic promotion转换为`int`，从而被编译器认为是匹配的，但是如果我们设定使用`char`或`bool`调用`print(int)`是没有意义的，我们又能怎么做呢？

在C++中，如果我们有一个明确不希望调用的重载函数，我们可以使用`= delete`将该函数定义为已删除。如果编译器将函数调用与某个已删除的重载函数匹配，那么编译会因为报错而终止。下面这段代码中，我们使用= delete来优化一下：

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

    return 0;
}
```

我们要单独讨论一下`printInt(5.0)`。首先，编译器检查是否存在完全匹配的 `printInt(double)`，显然并没有。接下来，编译器尝试找到最佳匹配项。尽管 `printInt(int)` 是唯一未删除的函数，但已删除的函数仍被视为函数重载解析中的候选函数。由于这些函数都不是明确的最佳匹配，因此编译器将发出不明确的匹配编译错误。

所以说，`= delete`只是在声明，我们不使用这个函数，而非宣布这个函数不存在了。被delete的函数也会完整地参与整个重载过程。

---

