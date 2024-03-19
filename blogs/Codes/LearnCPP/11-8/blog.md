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

