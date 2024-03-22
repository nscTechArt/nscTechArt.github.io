---
layout: page
permalink: /blogs/Codes/LearnCPP/12-7/index.html
title: Introduction to pointers
---

### Introduction to pointers

---

在开始学习指针之前，我们先来考虑下面这个例子，一个普通的变量

```c++
char x {}; // char use 1 byte of memory
```

当这行代码被执行时，RAM中的一段内存将会被分配给该对象。举例来说，变量`x`被分配到内存地址`140`。当我们在表达式或语句中使用到变量`x`的时候，程序都会赚到内存地址`140`处以访问存储在那里的值。

变量的好处在于，我们不需要担心分配了哪些特定的内存地址，或者存储该变量需要多少字节。我们只需要通过给定的标识符来索引变量，编译器就将标识符转换为分配的内存地址。

对引用来说也是如此，

```c++
int main()
{
	char x {}; // assume this is assigned memory address 140
	char& ref {x}; 
    
    return 0;
}
```

因为`ref`充当`x`的别名，所以每当我们使用`ref`时，程序都会转到内存地址`140`来访问该值。同样，编译器负责寻址，因此我们不必考虑其中的细节



默认情况下，变量所使用的内存地址是不会向我们公开的，但是我们也可以通过**address-of operator**(&)来返回内存地址，例如

```c++
#include <iostream>

int main()
{
    int x {5};
    std::cout << x << '\n'; // print value of x
    std::cout << &x << '\n'; // print memory address of x
    
    return 0;
}
```

对于使用多个字节内存的对象，取址符会返回该对象使用的第一个字节的地址。



`&`很容易造成混淆，我们可以通过上下文来判断`&`的含义

- 当跟随一个类型名时，`&`表示左值引用 `int& ref`
- 当在表达式中作为一元操作符使用时，`&`用来返回地址 `std::cout << &x`
- 当在表达式中作为二元操作符使用时，`&`用来表示位运算AND操作符 `std::cout << x & y`



获取变量的地址本身通常不是很有用，我们通常是访问存储在该地址上的值。**deference operator**(*)会将给定内存地址处的值作为左值返回出来

```c++
#include <iostream>

int main()
{
	int x {5};
	std::cout << x << '\n';  // print value of x
	std::cout << &x << '\n'; // print memory address of x
	std::cout << *(&x) << '\n' // print value of memory address of x
        
    return 0;
}
```

现在，我们终于可以了解指针了



指针是将内存地址（通常是另一个变量的地址）作为其值的对象，这允许我们存储一些其他的一些对象的地址以供以后使用

在现代C++中，由于需要和引入的智能指针作区分，我们将目前讨论的指针称为raw pointers或者dumb pointers

指针的声明与引用类似，是这样的

```c++
int; // a simple int
int&; // a lvalue reference to int value
int*; // a pointer to an int value, holds the address of an integer value
```

默认情况下，指针不会被初始化，未被初始化的指针包含了垃圾地址，被称为百搭指针 wild pointer。所以我们要养成初始化指针的好习惯。而当我们初始化指针时，也应该注意，必须使用地址初始化。

就像引用类型需要与被引用的对象的类型匹配一样，指针的类型也必须与指向的对象的类型一致，比如

```c++
int main()
{
    int i{ 5 };
    double d{ 7.0 };

    int* iPtr{ &i };     // ok: a pointer to an int can point to an int object
    int* iPtr2 { &d };   // not okay: a pointer to an int can't point to a double object
    double* dPtr{ &d };  // ok: a pointer to a double can point to a double object
    double* dPtr2{ &i }; // not okay: a pointer to a double can't point to an int object

    return 0;
}
```

同时，绝大多数情况下，我们不能使用literal初始化指针。有一个例外，我们将会在下一篇博客中讨论



我们可以使用两种方式，将指针和赋值一起使用

- 更改指针所指向的对象（为指针分配新的内存地址）
- 更改指针所指向的值

我们先看第一种用法：

```c++
#include <iostream>

int main()
{
    int x {5};
    int* ptr {&x};
    
    std::cout << *ptr << '\n';
    
    int y {6};
    ptr = &y; // change ptr to point at y
    
    std::cout << *ptr << '\n';
    
    return 0;
}
```

这段程序会打印

```c++
5
6
```

我们再看看第二种用法，也就是改变指针所指向的值

```c++
#include <iostream>

int main()
{
    int x {5};
    int* ptr {&x};
    
 	std::cout << x << '\n';
    std::cout << *ptr << '\n';
    
    *ptr = 6;
    
    std::cout << x << '\n';
    std::cout << *ptr << '\n';
    
    return 0;
}
```

这个程序的打印结果为：

```c++
5
5
6
6
```



指针与左值引用其实有点类似，但二者之间还是有一些区别

- 引用必须初始化，指针不需要初始化（只是应该初始化）
- 引用并非对象，但指针是
- 我们无法更改引用的引用对象，但是指针可以重新指定对象
- 引用必须始终绑定到对象上，但指针可以指向noting
- 引用是安全的（除了悬空引用），但指针本质上是危险的



需要注意的是，取址操作符`&`并不是以literal的形式返回地址的，而是返回一个包含地址的指针，该指针的类型派生自参数，也就是说，获取`int`的地址得到的将是`int`指针中的地址



指针的大小取决于编译可执行文件的体系结构 -- 32 位可执行文件使用 32 位内存地址 -- 因此，32 位计算机上的指针是 32 位（4 字节）。对于 64 位可执行文件，指针将为 64 位（8 个字节）。请注意，无论指向的对象的大小如何，这都是正确的

指针的大小始终相同。这是因为指针只是一个内存地址，访问内存地址所需的位数是恒定的。



与悬空引用类似，悬空指针是保存不再有效的对象的地址的指针，同样也可能会导致为定义的行为。
