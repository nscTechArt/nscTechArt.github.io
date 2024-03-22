---
layout: page
permalink: /blogs/Codes/LearnCPP/12-2/index.html
title: Value categories(Lvalues and Rvalues)
---

### Value categories(Lvalues and Rvalues)

---

在我们讨论左值引用前，我们先看了解一下什么是左值。

我们将C++中的表达式expression定义为：可执行的用来生成单一值的literals、变量、操作符和函数调用的组合，也可能产生side effects。

除了产生值和副作用以外，表达式还可以计算对象或函数，为此，C++中的表达式都具备两个属性，类型type和值类别value category

#### Type of an expression

表达式的类型等于表达式生成的值、对象或函数的类型。例如

```c++
int main()
{
	auto v1 {12 / 4};
	auto v2 {12.0 / 4};
	
	return 0;
}
```

对于`v1`来说，编译器会在编译时确定整数除法会返回`int`的结果，因为`int`是该表达式的类型。对于`v2`来说，`double`是该表达式的类型。

编译器可以使用表达式的类型来确定表达式在给定的上下文中是否有效，例如：

```c++
#include <iostream>

void print(int x)
{
    std::cout << x << '\n';
}

int main()
{
    print("foo"); // error: print() was expecting an int argument, we tried to pass in a string literal

    return 0;
}
```

在上面这段代码中，`print(int)`需要`int`类型的变量，与我们的表达式类型不匹配，且无法转换，因此会导致编译错误。

请注意，表达式的类型必须在编译时可确定，否则类型检查和类型推导会不起作用。但是表达式的值可以在编译时（constexpr）或者运行时（非constexpr）确定。



考虑下面这段代码：

```c++
x = 5; // valid: we can assign 5 to x
5 = x; // error: can not assign value of x to literal value 5
```

这两个赋值语句，一个有效一个无效，编译器是如何知道哪些表达式可以正确地出现在赋值语句的两端呢？这依靠的是表达式的第二个属性：值类别。值类别代表了表达式是解析为值、函数还是某种对象。

在C++11之前，只有两个值类别，左值和右值。C++11后，为了支持`move sematics`，新添加了三个值类别，`glvalue`  `prvalue` `xvalue` 



左值是一种计算结果为identifiable可识别对象或函数或bit-filed的表达式。

C++标准使用了*identity*这个术语，但是定义并不充分。一个具有identity的entity实体（比如对象或函数）可以与其他相似的实体区分开来。

具有identity的实体可以通过标识符、引用或指针进行访问，并且通常会比单个表达式或语句有更长的生命周期。在下面这段代码中

```c++
int main()
{
	int x {5};
	int y {x}; // x is an lvalue expression
    
    return 0;
}
```

表达式`x`是一个左值表达式，因为它的计算结果为变量`x`，且`x`是有标识符的。

左值还有两种子类型，可修改的左值和不可修改的左值。

右值是非左值表达式的表达式，计算结果为一个值。常见的右值包括literal，按值返回的函数、操作符的返回值。右值表达式是不可识别的，这意味着右值需要立即使用，并仅存在于使用它们的表达式中。

现在我们就可以回答为什么`x = 5`是正确的，而`5 = x`是错误的这个问题了：赋值操作符要求左边的运算数是可以修改的左值表达式，右边的运算数是右值表达式。
