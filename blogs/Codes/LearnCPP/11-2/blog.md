---
layout: page
permalink: /blogs/Codes/LearnCPP/11-2/index.html
title: Function overload differentiation
---

### Function overload differentiation

---

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
