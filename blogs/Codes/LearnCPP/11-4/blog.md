---
layout: page
permalink: /blogs/Codes/LearnCPP/11-4/index.html
title: Function Overloading and Function Templates
---

### Deleting functions

---

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

所以说，`= delete`只是在声明，我们不使用这个函数，而非宣布这个函数不存在了。被`= delete`的函数也会完整地参与整个重载过程。

