---
layout: page
permalink: /blogs/Codes/LearnCPP/12-10/index.html
title: Pass by address
---

### Pass by address

---

在此之前，我们已经接触到了两种向函数传递参数的方法：按值传递、按引用传递。我们可以通过下面这段代码回顾一下，参数使用`std::string`：

```c++
#include <iostream>
#include <string>

void printByValue(std::string val)
{
    std::cout << val << '\n';
}

void printByReference(const std::string& ref)
{
    std::cout << ref << '\n';
}

int main()
{
    std::string str{ "Hello, world!" };

    printByValue(str); // pass str by value, makes a copy of str
    printByReference(str); // pass str by reference, does not make a copy of str

    return 0;
}
```

这两种方式，在函数调用时，都会提供实际的对象作为参数。



C++还有一种传递参数的方式，按地址传参

```c++
#include <iostream>
#include <string>

void printByAddress(const std::string* ptr) // The function parameter is a pointer that holds the address of str
{
    std::cout << *ptr << '\n'; // print the value via the dereferenced pointer
}

int main()
{
    std::string str{ "Hello, world!" };

    printByAddress(&str); // pass str by address, does not make a copy of str

    return 0;
}
```



在这几种传递方式中，我们应该优先使用const引用的方法，原因有以下几点。

首先，由于按地址传递的对象必须有地址，因为使用地址传递的方式只能传递左值，右值没有地址。通过const引用的方式会更加灵活，因为它既可以传递左值，也可以传递右值。

其次，使用引用传递的语法是自然的，但是对于地址传递，可能会在程序中遍布`&` 和 `*`
