---
layout: page
permalink: /blogs/Codes/LearnCPP/11-5/index.html
title: Defualt arguments
---

### Defualt arguments

---

**default argument**指的是函数参数所提供的默认值，例如：

```c++
void print(int x, int y = 10) // 10 is the default argument
{
    std::cout << "x: " << x << '\n';
    std::cout << "y: " << y << '\n';
}
```

当进行函数调用时，如果提供了参数的值，也使用函数调用时提供的值，否则就使用default argument的值。

当指定默认参数时，必须使用等号，括号和大括号并不能起作用。

```c++
void foo(int x = 5);   // ok
void goo(int x ( 5 )); // compile error
void boo(int x { 5 }); // compile error
```

#### When to use default arguments

当函数需要一个合理的默认参数值，且又希望调用者可以根据需要改写该值时，就可以使用default argument。比如说下面这两个函数：

```c++
int rollDie(int sides=6);
void openLogFile(std::string filename="default.log");
```

#### Multiple default arguments

一个函数可以有多个default arguments，例如

```c++
#include <iostream>

void print(int x=10, int y=20, int z=30)
{
    std::cout << "Values: " << x << " " << y << " " << z << '\n';
}

int main()
{
    print(1, 2, 3); // all explicit arguments
    print(1, 2); // rightmost argument defaulted
    print(1); // two rightmost arguments defaulted
    print(); // all arguments defaulted

    return 0;
}
```

#### Default arguments can not be redeclared

一旦声明，默认参数就不能重新声明。这意味着对于具有正向声明和函数定义的函数，默认参数可以在正向声明或函数定义中声明，但不能同时声明两者。

```c++
#include <iostream>

void print(int x, int y=4); // forward declaration

void print(int x, int y=4) // error: redefinition of default argument
{
    std::cout << "x: " << x << '\n';
    std::cout << "y: " << y << '\n';
}
```

最佳做法是在正向声明中声明默认参数，而不是在函数定义中声明默认参数，因为正向声明更有可能被其他文件看到（尤其是在头文件中时）

在头文件中：

```c++
#ifndef FOO_H
#define FOO_H
void print(int x, int y=4);
#endif
```

在*main.cpp*中

```c++
#include "foo.h"
#include <iostream>

void print(int x, int y)
{
    std::cout << "x: " << x << '\n';
    std::cout << "y: " << y << '\n';
}

int main()
{
    print(5);

    return 0;
}
```

