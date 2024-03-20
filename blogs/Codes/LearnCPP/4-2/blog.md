---
layout: page
permalink: /blogs/Codes/LearnCPP/4-2/index.html
title: Void
---

### Void

---

void是我们在学习这个系列教程中遇到的第一个**incomplete type**。incomplete type指的是已声明但是没有定义的类型。编译器知道这种类型的存在，但是没有足够的信息来确定要为该类型的对象分配多少内存。`void`被特意设计为不完整的，这样它可以表示缺少类型，因为也是无法定义的。

我们不能实例化不完整类型，例如

```c++
void value; // won't work, variables can't be defined with incomplete type void
```

`void`最通常的用法是表示函数没有返回值。在C语言，`void`还会用来表示函数没有参数，不过在C++中这种写法被弃用了。

`void`还会被用在指针中，不过我们到后面再讨论吧
