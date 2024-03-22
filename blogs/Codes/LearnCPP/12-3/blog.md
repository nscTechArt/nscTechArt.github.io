---
layout: page
permalink: /blogs/Codes/LearnCPP/12-3/index.html
title: Lvalue references
---

### Lvalue references

---

在C++中，引用是现有对象的别名。当一个引用被定义后，任何对于该引用的操作都会应用在被引用的对象上。引用实际上于被引用的对象是相同的。也就是说，我们可以通过引用来读取或修改被引用的对象。

现代C++包含两种引用，左值引用和右值引用，我们先来了解一下左值引用。

声明一个左值引用，我们需要在类型声明中使用`&`符号

```c++
int& 
double&
```

我们可以对左值引用执行的操作之一是，创建左值引用变量，例如

```c++
#include <iostream>

int main()
{
	int x {5};    // x is a normal integer variable
	int& ref {x}; // ref is an lvalue reference variable that can now be used as 
				  // an alias for variable x
  	
  	std::cout << x << '\n';  // print the value of x (5)
    std::cout << ref << '\n'; // print the value of x via ref (5)

    return 0;
}
```

在这个实例中，我们使用引用来读取被引用对象的值。我们还可以使用引用来修改被引用对象的值

```c++
#include <iostream>

int main()
{
    int x { 5 }; // normal integer variable
    int& ref { x }; // ref is now an alias for variable x

    std::cout << x << ref << '\n'; // print 55

    x = 6; // x now has value 6

    std::cout << x << ref << '\n'; // prints 66

    ref = 7; // the object being referenced (x) now has value 7

    std::cout << x << ref << '\n'; // prints 77

    return 0;
}
```

这段代码的输出结果是：

```c++
55
66
77
```





与常量类似的是，所有的引用必须初始化。当引用使用对象或者函数初始化时，我们称引用绑定到该对象（函数）上。需要注意的是，引用必须要绑定到可修改的左值上。

大多数情况下，引用的类型需要与被引用的对象的类型匹配（有例外，我们会在继承中涉及到）。

我们也无法对`void`使用左值引用（意义何在？）

引用一旦初始化，就无法更改为另一个对象的引用。也就是说，我们无法通过对引用赋值，让其引用另一个对象，例如下面这个程序，最终的输出值为`6`

```c++
#include <iostream>

int main()
{
    int x { 5 };
    int y { 6 };

    int& ref { x }; // ref is now an alias for x

    ref = y; // assigns 6 (the value of y) to x (the object being referenced by ref)
    // The above line does NOT change ref into a reference to variable y!

    std::cout << x << '\n'; // user is expecting this to print 5

    return 0;
}
```





左值引用遵循与普通变量相同的范围与持续时间。但引用的生存周期和被引用对象的生存周期是独立的，也就是说，下面两个情况都是成立的。

- 引用可以被提前销毁
- 被引用的对象也可以在引用被销毁之前销毁

当引用被提前销毁时，被引用的对象就正常进行，不会受影响，但是当被引用的对象被提前销毁时，引用还是会保留对不存在的对象的引用，这种引用被称为悬空引用。访问悬空引用会引发未定义的行为。





值得注意的是，引用并非C++中的一个对象，它不需要占用存储

