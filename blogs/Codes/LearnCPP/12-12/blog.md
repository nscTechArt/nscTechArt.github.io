---
layout: page
permalink: /blogs/Codes/LearnCPP/12-12/index.html
title: Return by reference and return by address
---

### Return by reference and return by address

---

在按值传递时，argument的副本会被传递给函数parameter。对于基础类型来说，没有什么问题，但是对于class等类型来说，复制通常的代价较大，所以我们会通过引用或地址传递。

当我们按值返回时，也会面临同样的问题，所以我们要介绍按引用返回和按地址返回。我们先来看看按引用返回



当我们想要通过引用返回时，只需要将函数的返回类型定义为引用类型：

```c++
std::string& returnByReference();
const std::string& returnByReferenceToConst();
```

我们来看一个按引用返回的简单例子：

```c++
#include <iostream>
#include <string>

const std::string& getProgramName() // return a const refence
{
    // has static duration, destoryed at end of program
    static const std::string s_programName {"Calculator"};
    return s_programName;
}

int main() {
    std::cout << "This program is named " << getProgramName();
}
```

当使用引用返回类型时，有一个需要注意的地方：我们必须确保被返回的对象的生命周期要比对应的函数更长，否则返回的引用将会处于悬空的状态，也就是说，引用了一个已经被销毁的对象，从而会导致未被定义的行为。在我们上面的例子中，返回的类型被声明为`static`，就可以确保该对象知道程序结束时才会被销毁。

总结一下就是，**不要通过引用返回非静态的局部变量或临时变量。**



如果一个函数返回引用，并且该引用用于初始化或赋值一个非引用类型的变量，则返回的变量也会被拷贝一份。我们考虑下面这个程序

```c++
#include <iostream>

const int& getNextID()
{
    static int s_x {0};
    ++s_x;
    return s_x;
}

int main()
{
    const int id1 {getNextID()};
    const int id2 {getNextID()};

    std::cout << id1 << id2 << '\n';

    return 0;
}
```

在这段程序中，`getNextID()`返回一个引用，但是`id1`和`id2`是非引用变量。这种情况下，返回的引用的值将被复制到常规的变量中，因为，这个程序会输出`12`。只是，这个程序实际上违背了我们使用引用的初衷，所以这个例子只是为了向我们说明一个语法知识。



按地址返回的方法与按引用返回类似，只是返回的是对象的指针而非引用。同样的，按照地址返回的对象也必须超出对应函数的作用域。

与按照引用返回相比，按照地址返回的优势在于，如果没有要返回的对象，我们可以让函数返回`nullptr`。

缺点也很明显，对于函数调用得到的结果，我们在解引用之前必须进行`nullptr`的检查，否则会导致未定义的行为。

所以我们应该优先选择按照引用返回的方法
