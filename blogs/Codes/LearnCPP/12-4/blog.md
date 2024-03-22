---
layout: page
permalink: /blogs/Codes/LearnCPP/12-4/index.html
title: Lvalue references to const
---

### Lvalue references to const

---

我们在前面的博客中了解到，左值引用值能绑定到可修改的左值表达式上，这意味着下面这段代码是错误的。

```c++
int main()
{
	const int x {5};
	int& ref {x}; // error: ref can not bind to non-modifiable lvalue
	
	return 0;
}
```

但是如果我们想要创建一个可以引用的const变量要怎么办呢？显然我们不能再使用普通的左值引用了。

我们可以使用const来声明一个左值引用，这样就可以绑定不能修改的左值表达式了，例如：

```c++
int main()
{
	const int x {5};
	const int& ref {x};
	
	return 0;
}
```

该引用可以用来访问变量，但是不能用来修改所引用的值。





const的左值引用实际上也可以绑定到可以修改的左值表达式上。这种情况下，通过引用访问时，被引用的对象将会被视为const（即使对象本身也非const的），例如

```c++
#include <iostream>

int main()
{
    int x { 5 };          // x is a modifiable lvalue
    const int& ref { x }; // okay: we can bind a const reference to a modifiable lvalue

    std::cout << ref << '\n'; // okay: we can access the object through our const reference
    ref = 7;                  // error: we can not modify an object through a const reference

    x = 6;                // okay: x is a modifiable lvalue, we can still modify it through the original identifier

    return 0;
}
```





实际上，我们也可以使用右值来初始化一个const左值引用，例如

```c++
#include <iostream>

int main()
{
	const int& ref {5}; // fine
	std::cout << ref << '\n'; // prints 5
	
	return 0;
}
```

在这个程序中，会创建一个临时对象，并使用我们提供的右值进行初始化，然后再将const左值引用绑定到该临时对象上。

临时对象通常在创建临时对象的表达式末尾销毁。但是，请考虑如果为保存 rvalue 5 而创建的临时对象在初始化 ref 的表达式末尾被销毁，则在上面的示例中会发生什么。引用 ref 将悬空（引用已销毁的对象），当我们尝试访问 ref 时，我们会得到未定义的行为。为了避免在这种情况下出现悬空引用，C++ 有一个特殊的规则：当常量左值引用直接绑定到临时对象时，临时对象的生存期将延长以匹配引用的生存期。
