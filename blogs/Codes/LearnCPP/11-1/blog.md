---
layout: page
permalink: /blogs/Codes/LearnCPP/11-1/index.html
title: Introduction to function overloading
---

### Introduction to function overloading

---

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

