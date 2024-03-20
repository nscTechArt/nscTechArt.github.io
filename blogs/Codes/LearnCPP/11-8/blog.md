---
layout: page
permalink: /blogs/Codes/LearnCPP/11-8/index.html
title: Defualt arguments
---

### Function templates with multiple template types

---

我们从一个示例中引入这篇博客的主要内容。考虑下面这段代码：

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
	return 0;
}
```

我们来分析一下编译的过程。首先，我们的函数调用并非通过尖括号指定实际的参数类型。在我们的调用`max(2, 3.5)`中，编译器将首先查看`max(int, double)`是否存在非函数模版的匹配项，显然没有。

接下来，编译器会使用函数模版推导来试着找到函数模版匹配项。原因很简单，因为模版参数`T`只能表示单一类型，函数调用中的参数必须解析为相同的实际类型。

所以我们的函数调用是无法解析的，就产生了编译错误。

你是否会有疑问：为什么编译器不生成函数`max(double, double)`，然后通过numberic conversion将函数调用中的`int`转换为`double`呢？答案也很简单，因为类型转换是在解析函数重载时进行的，而不是在模版函数参数推导时进行的。

显然这种机制的设计是C++有意为之的，同时我们也有一些方法来解决这个问题。

---

#### Using static_cast to convert the arguments to matching types

第一种方法是，让函数调用负责将参数类型转换为匹配类型的任务。例如

```c++
#include <iostream>

template <typename T>
T max(T x, T y)
{
    return (x < y) ? y : x;
}

int main()
{
    std::cout << max(static_cast<double>(2), 3.5) << '\n'; // convert our int to a double so we can call max(double, double)

    return 0;
}
```

因为两个参数都是`double`类型，编译器就会实例化`max(double, double)`

#### Provide an explicit type template argument

如果在函数调用时，指定出要使用的显式类型的模版参数，就可以避免模版参数推导了

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

    return 0;
}
```

这种方法比使用`static_cast`具有更强的可读性，但是如果我们在对`max`调用时不必考虑参数类型就更好了，这也就是下一种方法

#### Functions templates with multiple template type parameters

我们的函数调用`max(int, double)`之所以会出现问题，根本原因在于，我们只使用了一个模版类型来定义我们的模版函数，所以函数调用中的参数类型必须解析为同一种。最好的解决办法在于，使用两个模版类型来重新定义模版函数

```c++
#include <iostream>

template <typename T, typename U> 
// We're using two template type parameters named T and U
T max(T x, U y) // x can resolve to type T, and y can resolve to type U
{
    return (x < y) ? y : x; // uh oh, we have a narrowing conversion problem here
}

int main()
{
    std::cout << max(2, 3.5) << '\n';

    return 0;
}
```

在上面这段代码中，编译器会正确地实例化`max<int, double>(int, double)`。然而还是有一点问题，根据算数规则，`double`优先于`int`，所以条件操作符`？`会返回`double`，但是模版函数的返回类型是`T`,会被编译器解析为`int`，这会产生警告，可能也会导致数据的丢失。将返回类型设置为`U`也不能解决问题，因为我们在函数调用中会任意翻转运算数。

我们的解决办法是，使用`auto`来表示模版函数的返回类型，编译器会从返回语句中推导返回类型。

```c++
template <typename T, typename U>
auto max(T x, U y)
{
    return (x < y) ? y : x;
}
```

#### Abbreviated function templates C++20

C++20为`auto`引入了新的用法。当`auto`在普通的函数中用作参数类型时，编译器会自动将函数转换为函数模版，这种创建函数模版的方法被称为abbriviated function templates缩写函数模版，例如

```c++
auto max(auto x, auto y)
{
	return (x < y) ? y : x;
}
```

这段代码是C++20中对下面内容的简写

```c++
template <typename T, typename U>
auto max(T x, U y)
{
	return (x < y) ? y : x;
}
```

