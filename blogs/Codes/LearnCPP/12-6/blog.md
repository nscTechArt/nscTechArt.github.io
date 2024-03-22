---
layout: page
permalink: /blogs/Codes/LearnCPP/12-6/index.html
title: Pass by const lvalue reference
---

### Pass by const lvalue reference

---

常规的引用只能绑定到可修改的左值上，但是const引用是可以与可修改左值、不可修改左值和右值绑定的，所以我们将函数定义中的引用参数设为const，那么就可以绑定到任何类型的参数上。

```c++
#include <iostream>

void printValue(const int& y) // y is const reference now
{
	std::cout << y << '\n';
}

int main()
{
    int x {5};
    printValue(x); // x is modifiable lvalue
    
    const int z {5};
    printValue(x); // z is non-modifiable lvalue
    
    printValue(5); // 5 is a literal rvalue
    
    return 0;
}
```

使用const引用参数，与非const的引用参数一样，可以避免复制参数，除此以外，还可以保证函数无法修改所引用的值，例如下面这段函数中，对`ref`的修改就是不被允许的

```c++
void addOne(const int& ref)
{
	++ref; // not allowed: ref is const
}
```

在函数定义中使用const引用参数是一种普遍且优先的用法，因为大多数情况下，我们不会允许函数修改参数值



如果一个函数有多个参数，那么每个参数都可以确认是否使用引用参数，或者const引用参数，例如：

```c++
#include <string>

void foo(int a, int& b, const std::string& c)
{
}

int main()
{
    int x { 5 };
    const std::string s { "Hello, world!" };

    foo(5, x, s);

    return 0;
}
```



