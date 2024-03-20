---
layout: page
permalink: /blogs/Codes/LearnCPP/11-9/index.html
title: Non-type template paramaters
---

### Non-type template parameters

---

在前面的博客中，我们讨论了如何创建使用类型模版参数的函数模版，其中的类型模版参数用作实际参数的占位符。现在我们来了解另一种模版参数，non-type template parameters

非类型模版参数是具有固定类型的模版参数，用作作为模版参数传入的`constexpre`值的占位符。非类型模版参数可以是以下的任意类型

- 任何integral类型
- 枚举类型
- `std::nullprt_t`
- 从C++20开始的任意floating point类型
- 指向对象的指针或引用
- 指向函数的指针或引用
- 指向成员函数的指针或引用
- 从C++20开始的literal class类型

下面是一个使用`int`非类型模版参数的例子

```c++
#include <iostream>

template <int N> // declare a non-type template parameter of type int named N
void print()
{
	std::cout << N << '\n'; // use value of N here
}

int main()
{
    print<5>();
    
    return 0;
}

// this program prints 5
```

一个好的习惯：使用`N`作为`int`非类型模版参数的名称

