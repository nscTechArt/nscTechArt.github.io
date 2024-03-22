---
layout: page
permalink: /blogs/Codes/LearnCPP/12-8/index.html
title: Null pointers
---

### Null pointers

---

除了存储内存地址外，指针还可以保存一个控制：null。这时指针不会指向任何对象，我们将指向null的指针称为null pointer。声明一个null指针可以这样做：

```c++
int main()
{
	int* ptr {};
	return 0;
}
```



与`true`和`false`表示布尔的literal值一样，我们可以使用关键字`nullptr`来表示一个空指针的literal，并且用这个关键字来初始化指针，或让指针指向一个空值，或者作为函数参数

```c++
int* ptr {nullptr};

int value {5};
int* ptr2 {&value};
ptr2 = nullptr;

someFunction(nullptr);
```

