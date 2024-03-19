---
layout: page
permalink: /blogs/Codes/LearnCPP/11-3/index.html
title: Function overload resolution and ambiguous matches
---

### Function overload resolution and ambiguous matches

---

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

