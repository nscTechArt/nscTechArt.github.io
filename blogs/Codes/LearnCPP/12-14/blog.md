---
layout: page
permalink: /blogs/Codes/LearnCPP/12-14/index.html
title: Type deduction with pointers, references, and const
---

### Type deduction with pointers, references, and const

---

开始之前，我们先来简单回顾一下前置知识。



`auto`关键字可以用来让编译器推导一个初始化的变量的类型，例如

```c++
int getValue(); // some function that returns an int by value

int main()
{
	auto val {getValue();}
	
	return 0;
}
```

默认情况下，`auto`关键字会丢弃`const`和`constexpr`限定符：

```c++
const double foo()
{
	return 5.6;
}

int main()
{
	const double cd {7.8}；
	
	auto x {cd}; // double (const dropped)
	auto y {foo()}; // double (const dropped)
	
	return 0;
}
```

我们可以通过在定义中添加`const`和`constexpr`限定符来重新应用`const`和`constexpr`限定符

```c++
const double foo()
{
    return 5.6;
}

int main()
{
    constexpr double cd{ 7.8 };

    const auto x{ foo() };  // const double (const dropped, const reapplied)
    constexpr auto y{ cd }; // constexpr double (constexpr dropped, constexpr reapplied)
    const auto z { cd };    // const double (constexpr dropped, const applied)

    return 0;
}
```

现在，我们来看看类型推导是如何与引用、指针结合的



类型推导会导致引用被删除，比如下面这段代码

```c++
#include <string>

std::string& getRef(); // some function return a reference

int main()
{
	auto ref {getRef();} // type deducted as std::string, not std::string&
    
    return 0;
}
```

与`const`类似，我们可以通过将推导得到的类型重新定义为引用

```c++
#include <string>

std::string& getRef(); // some function return a reference

int main()
{
    auto ref1 { getRef() };  // std::string (reference dropped)
    auto& ref2 { getRef() }; // std::string& (reference reapplied)
    
    return 0;
}
```

