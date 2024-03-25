---
layout: page
permalink: /blogs/Codes/LearnCPP/12-9/index.html
title: Pointers and const
---

### Pointers and const

---

我们回顾一下常规指针的用法：

```c++
int main()
{
	int x {5};
    int* ptr {&x};
    
    int y {6};
    ptr = &y;
    *ptr = 7;
    
    return 0;
}
```

以上面的这段代码为例，对于一个常规指针，我们可以更改指针所指向的对象，也可以修改指针所存储的地址对应的值。但是如果指针是const呢？比如说下面这段代码

```c++
int main()
{
	const int x {5};
	int* ptr {&x}; // compile error: cannot convert from const int* to int*
	
	return 0;
}
```

当我们尝试运行这段代码，编译器会弹出报错。常量变量的值是不能修改的，如果我们将一个非指向const的指针指向一个常量，这会允许我们使用解引用并修改该值，这是矛盾的。

但是，指向const的指针本身并非const的，它只是指向一个const值，我们可以依然可以为指向const的指针分配一个新的地址，从而改变指针所指向的对象：

```c++
int main()
{
	const int x {5};
	const int* ptr {&x}; // ptr points to const int x
	
	const int y {6};
	prt = &y; // ptr now points as const int y
	
	return 0;
}
```

与const引用一样，指向const的指针也可以指向非const变量。指向const的指针会将指向的对象视为const，无论被指向的对象本身是否为const：

```c++
int main()
{
	int x {5};  // not const
	const int* ptr {&x}; // ptr points to a "const int"
	
	*ptr = 6; // not allowed: ptr points to a "const int", so we cannot change the value through ptr
	x = 6; // okay
	
	return 0;
}
```



我们当然也可以让指针本身称为常量，const指针就是初始化地址后无法更改的指针。想要声明一个const指针，我们需要将`const`关键字放在`*`后面。就和普通的const变量一样，const指针必须在定义时初始化，并且该指针不能通过赋值来更改：

```c++
int main()
{
	int x {5};
    int y {6};
    
	int* const ptr {&x}; // const after the asterisk means this is a const pointer
	ptr = &y; // error: once initialized, a const pointer can not be changed
    
	return 0;
}
```

但是const指针所指向的对象可以是非const的变量，我们还是可以通过解引用来更改指针所指向的对象的值：

```c++
int main()
{
	int x {5};
	int* const ptr {&x}; // ptr will always point to x
	
	*ptr = 6; // okay
	
	return 0;
}
```



当然，我们还可以声明一个指向const变量的const指针：

```c++
int main()
{
	int value {5};
	const int* const ptr {&value}; // a const pointer to a const value
	
	return 0;
}
```

