---
layout: page
permalink: /blogs/Codes/LearnCPP/12-5/index.html
title: Pass by lvalue reference
---

### Pass by lvalue reference

---

在前面的博客中，我们已经初步了解了左值引用和const左值引用，现在我们再来探讨一下左值引用的意义是什么。我们先看下面这个按值传递的例子

```c++
#include <iostream>

void printValue(int y)
{ 
	std::cout << y << '\n';
} // y is destroyed here

int main()
{
    int x {2};
    
    printValue(x); // x is passed by value (copied) into parameter y (inexpensive)
    
    return 0;
}
```



标准库提供的大多数类型都是`class`类型，比如`std::string`。class通常copy的成本较高，所以我们应该尽可能避免不必要的拷贝，特别是这些类型的副本还会被当即销毁的情况。

我们通常的解决办法是按引用传递，而非按值传递。当使用按引用传递时，我们将函数的参数声明未引用类型，而非普通类型，在调用函数时，我们将引用参数绑定给对应的参数。因为引用实际上是参数的别名而已，所以这种做法并不会创建参数的副本。下面是一个按照引用传递的例子

```c++
#include <iostream>
#include <string>

void printValue(std::string& y)
{
    std::cout << y << '\n';
}

int main()
{
    std::string x {"Hello, world"};
    
    printValue(x);
    
    return 0;
}
```



按照值传递对象是，函数参数接收的是参数的副本，这意味着任何对于参数值的更改都是基于参数的副本的，对参数本身不会有任何影响。

但是，引用实际上与被引用的对象是同一的，所以对引用参数所做的修改，也会影响参数本身

```c++
#include <iostream>

void addOne(int& y)
{
    y += 1;
}

int main()
{
    int x {5};
    std::cout << x << '\n';
    addOne(x);
    std::cout << x << '\n';
    return 0;
}

// 两次打印的结果分别是5和6
```

