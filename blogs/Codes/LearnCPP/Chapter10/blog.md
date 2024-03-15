---
layout: page
permalink: /blogs/Codes/LearnCPP/Chapter10/index.html
title:Type Conversion, Type Aliases, and Type Deduction
---

### **Type Conversion, Type Aliases, and Type Deduction**

---

#### 10.1 Implicit type conversion

对象的值存储为bits序列，对象的数据类型告诉编译器如何将这些bits解释为有意义的值。不同的数据类型可能以不同的方式表示“相同”的数字。例如，整数值 3 可能存储为二进制 0000 0000 0000 0000 0000 0000 0011，而浮点值 3.0 可能存储为二进制 0100 0000 0100 0000 0000 0000 0000 0000 0000 0000。

试想，下面这行代码会给我们什么结果：

```c++
float f{3}; // initialize floating point variable with int 3
```

这种情况下，编译器不能将表示整数值`3`的bits复制到为浮点数`f`分配的内存中。相反，编译器需要将整数数值`3`转换为等效的浮点数值`3.0`，然后才可以将其存储在分配给`f`的内存中

从一种类型的值生成另一种类型的新值的过程称为**conversion**转换。转换可以通过两种方式实现：一种是隐式转换(根据编译器的需求)，另一种是显式转换(当程序员请求时)。我们先来看隐式转换

---

当提供的数据类型与所需的数据类型不匹配时，编译器会自动执行隐式类型转换。C++中的绝大多数类型转换都是隐式的。以下所有情况中，都会采用隐式转换：

- 初始化或赋值不同类型的变量的值时：

  ```c++
  double d{3};  // int value 3 implicitly converted to type double
  d = 6; // int value 6 implicitly converted to type double
  ```

- 返回值的类型与函数声明的返回类型不一致时：

  ```c++
  float doSomething()
  {
  	return 3.0; // double会转换为float
  }
  ```

- 二元操作符的两个运算数类型不一致时：

  ```c++
  double divisiion{4.0 / 3}; //int类型的3会转换为double类型
  ```

- `if`语句中使用非布尔值时：

  ```c++
  if(5) //int类型的5会转换为bool类型
  {
  }
  ```

- 传递给函数的参数类型与函数参数类型不一致时：

  ```c++
  void doSomething(long l)
  {
  }
  
  doSomething(3); //int类型的3会转化为long类型
  ```

---

调用类型转换（无论是隐式还是显式）时，编译器将确定是否可以将值从当前类型转换为所需类型。如果可以找到有效的转换，则编译器将生成所需类型的新值。请注意，类型转换不会更改要转换的值或对象的值或类型。如果编译器找不到可接受的转换，则编译将失败并出现编译错误。类型转换可能由于多种原因而失败。例如，编译器可能不知道如何在原始类型和所需类型之间转换值。在其他情况下，语句可能不允许某些类型的转换。例如：

```c++
int x { 3.5 }; // brace-initialization disallows conversions that result in data loss
// 即使编译器知道如何将double值转换为 int 值，但在使用大括号初始化时不允许进行此类转换
```

在某些情况下，编译器可能无法确定几种可能的类型转换中哪一种是明确使用的最佳类型转换。我们会在后面讨论这种情况。但是，我们还不知道，编译器如何确定它是否可以将值从一种类型转换为另一种类型呢？

---

