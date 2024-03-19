---
layout: page
permalink: /blogs/Codes/LearnCPP/11-7/index.html
title: Defualt arguments
---

### Function template instantiation

---

本篇博客中，我们来看看函数模版是如何使用的。

#### Using a function template

函数模版实际上并非函数，它们的代码不会被直接地编译或执行。相反，函数模版有一个工作：生成用来编译和执行的函数。

为了使用我们在前文创建的函数模版`max<T>`，我们可以使用下面的语法进行函数调用：

```c++
max<actual_type>(arg1, arg2);
```

看上去就像是一个普通的函数调用，但最大的区别是将模版参数添加进尖括号中，将指定用于替换模版参数`T`的实际类型。我们来看下面这段简单的代码

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

从函数模版创建函数的过程被称为函数实例化。当这个过程通过函数调用发生时，就被称为隐式实例化。从模版中实例化得到的函数在技术上被称为专用话specialization，但是通用地来讲，会被称为函数实例。

---

#### Template argument deduction

大多数情况下，我们用来实例化的实际类型，通常与函数参数的类型是匹配的，比如：

```c++
std::cout << max<int>(1, 2) << '\n';
```

在这个函数调用中，我们指定了用`int`代替模版参数`T`，同时也是用`int`作为调用的参数的。

如果参数的类型与我们想要的实际类型匹配，我们不需要指定实际类型——相反，我们可以使用模板参数推导，让编译器从函数调用中的参数类型中推断出应该使用的实际类型。例如，上面的函数调用我们可以这样写：

```c++
std::cout << max<>(1, 2) << '\n';
std::cout << max(1, 2) << '\n';
```

这两种情况之间的区别在于，编译器如何从一组重载函数中解析有关。两种情况下，编译器都会考虑模版函数`max<int>`的重载函数，但是第二种情况还会额外考虑非模版函数的`max()`的重载函数。我们来看一个例子：

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
    std::cout << max<>(1, 2) << '\n';    // deduces max<int>(int, int) (non-template functions not considered)
    std::cout << max(1, 2) << '\n';      // calls max(int, int)

    return 0;
}
```

需要注意的是，最后一个调用的语法看起来就像是普通的函数调用。在大多数情况下，这都会是我们用来调用函数模版中实例化的函数的语法。这样做处于三个主要原因：

- 语法更为简洁
- 我们很少同时拥有匹配的非模版函数与函数模版
- 如果同时有匹配的非模版函数与函数模版，我们通常也更喜欢调用非模版函数

最后一点可能不是那么的明确。函数模版是适用于各种类型的，但是正因为如此，它必须是泛型的。非模版函数仅需要处理特定的类型组合，与模版函数相比，它可以针对特定类型有更好更优化的实现方式。例如

```c++
#include <iostream>

// This function template can handle many types, so its implementation is generic
template <typename T>
void print(T x)
{
    std::cout << x; // print T however it normally prints
}

// This function only needs to consider how to print a bool, so it can specialize how it handles
// printing of a bool
void print(bool x)
{
    std::cout << std::boolalpha << x; // print bool as true or false, not 1 or 0
}

int main()
{
    print<bool>(true); // calls print<bool>(bool) -- prints 1
    std::cout << '\n';

    print<>(true);     // deduces print<bool>(bool) (non-template functions not considered) -- prints 1
    std::cout << '\n';

    print(true);       // calls print(bool) -- prints true
    std::cout << '\n';

    return 0;
}
```

总结一下就是，在调用从函数模板实例化的函数时，最好使用正常的函数调用语法（除非您需要函数模板版本优先于匹配的非模板函数）

---

#### Function templates with non-temlate parameters

我们可以创建同时具有模版参数和非模版参数的函数模版，其中模版参数可以与任何类型匹配，而非模版参数的工作方式就像普通函数的参数那样。比如下段这个函数模版

```c++
// T is a type template parameter
// double is a non-template parameter
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

    return 0;
}
```

---

#### Instantiated functions may not always compile

考虑下面这个例子

```c++
#include <iostream>

template <typename T>
T addOne(T x)
{
    return x + 1;
}

int main()
{
    std::cout << addOne(1) << '\n';
    std::cout << addOne(2.3) << '\n';

    return 0;
}
```

这段代码中，编译器会高效地编译并分调用`addOne<int>(int)`和`addOne<double>(double)`。但是让让我们再考虑这段代码

```c++
#include <iostream>
#include <string>

template <typename T>
T addOne(T x)
{
    return x + 1;
}

int main()
{
    std::string hello { "Hello, world!" };
    std::cout << addOne(hello) << '\n';

    return 0;
}
```

当编译器尝试解析`addOne(hello)`时，它无法找到与`addOne(std::string)`匹配的非模版函数，而是会找到我们的函数模版`addOne(T)`，并会从函数模版中生成函数`addOne(std::string)`。如此一来，编译器就会生成并编译下面这段代码

```c++
#include <iostream>
#include <string>

template <typename T>
T addOne(T x);

template<>
std::string addOne<std::string>(std::string x)
{
    return x + 1;
}

int main()
{
    std::string hello{ "Hello, world!" };
    std::cout << addOne(hello) << '\n';

    return 0;
}
```

但是这段代码是无法编译的，因为编译器无法理解`std::string + 1`这样的代码。



