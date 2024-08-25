---
title: Move Semantics and Smart Pointers
date: 2024-08-22 15:02 +0800
categories: [Codes, Learn C++]
---

### 22.1 Introduction to smart pointers and move sementics

首先，我们考虑下面这段代码：

```c++
void someFunction()
{
    Foo *ptr = new Foo();

    delete ptr;
}
```

这段代码没有什么问题，但是当情况变复杂时，比如函数有多个return语句，那么我们就有可能漏掉删除分配的内存，例如：

```c++
void someFunction()
{
    Foo *ptr = new Foo();

    int x;
    std::cin >> x;
    if (x == 0)
        return;

    delete ptr;
}
```

