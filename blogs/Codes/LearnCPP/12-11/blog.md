---
layout: page
permalink: /blogs/Codes/LearnCPP/12-11/index.html
title: Pass by address
---

### Pass by address (part 2)

---

按地址传递更常见的一种用途是允许函数接受"optional"的参数，我们看下面这个例子：

```c++
#include <iostream>
#include <string>

void greet(const std::string* name=nullptr)
{
    std::cout << "Hello";
    std::cout << (name ? *name : "guest") << '\n';
}

int main()
{
    greet(); // we don't know who the user is
    
    std::string joe {"Joe"};
    greet(&joe); // we know user is Joe
    
    return 0;
}
```

在这个程序中，`greet()`有一个按地址传递的参数，默认值为`nullptr`，所以这个程序中，我们可以调用没有参数的`greet()`。

只不过，很多情况下，我们是通过重载函数实现类似的需求的

```c++
#include <iostream>
#include <string>
#include <string_view>

void greet(std::string_view name)
{
	std::cout << "Hello " << name << '\n';
}

void greet()
{
	std::cout << "Hello guest" << '\n';
}

int main()
{
    greet(); // we don't know who the user is
    
    std::string joe {"Joe"};
    greet(&joe); // we know user is Joe
    
    return 0;
}

```

使用重载函数的好处是，我们不需要担心会出现的`nullptr`的解引用行为，更加安全



当我们按照地址传递时，地址会从参数(argument)拷贝到指针参数(pointer parameter)中，这没有任何问题，因为赋值地址是很快的。我们来考虑下面这段程序

```c++
#include <iostream>

// [[maybe_unused]]避免编译器对未使用的ptr2报错
void nullify([[maybe_unused]] int* ptr2)
{
	ptr2 = nullptr;
}

int main()
{
	int x {5};
    int* ptr {&x};
    
    std::cout << "ptr is " << (ptr? "non-null\n" : "null\n");
    
    nullify(ptr);
    
    std::cout << "ptr is " << (ptr? "non-null\n" : "null\n");
    return 0;
}
```

这个程序的输出结果为：

```c++
ptr is non-null
ptr is non-null
```

这个结果说明：更改pointer parameter保存的地址对于argument保存的地址没有影响。这个逻辑和通常的数据类型是一致的。那如果我们想要通过函数修改pointer parameter所指向的内容，应该怎么做呢？

答案是：通过引用传递指针。我们可以修改一下上面的程序

```c++
#include <iostream>

void nullify(int*& refptr) // refptr is now a reference to a pointer
{
    refptr = nullptr;
}

int main()
{
	int x {5};
    int* ptr {&x};
    
    std::cout << "ptr is " << (ptr? "non-null\n" : "null\n");
    
    nullify(ptr);
    
    std::cout << "ptr is " << (ptr? "non-null\n" : "null\n");
    return 0;
}
```

现在运行程序，我们会注意到，pointer parameter所指向的内容已经通过`nullify()`函数实现了修改

```c++
ptr is non-null
ptr is null
```





现在我们再来看看为什么C++中不再优先是用`0`或者`NULL`了。

首先`0`可以解释为integer literal，也可以解释为null pointer literal。在某些情况下，我们打算使用哪一个可能是模棱两可的——在某些情况下，编译器可能会假设我们指的是一个，而我们指的是另一个——会给我们的程序行为带来意想不到的后果。

预处理器宏 `NULL` 的定义不是由语言标准定义的。它可以定义为 `0`、`0L`、`（（void*）0）` 或完全其他的东西。
