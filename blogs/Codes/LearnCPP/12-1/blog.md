---
layout: page
permalink: /blogs/Codes/LearnCPP/12-1/index.html
title: Introduction to compound data types
---

### Introduction to compound data types

---

虽然我们已经对C++的中基础类型有了一定的了解，但是基础数据类型并不能帮助我们解决所有的问题。假定我们想要实现让两个分数相乘的数学程序，我们应该如何在程序中表达分数呢？让我们先尝试使用两个integral来表示一个分数，就像这样

```c++
#include <iostream>

int main()
{
    // our first fraction
    int num1 {};
    int den1 {};
    
    // our second fraction
    int num2 {};
    int den2 {};
    
    // used to remove the slash between the numberator and denominator
    char ignore {};
    
    std::cout << "Enter a fraction";
    std::cin >> num1 >> ignore >> den1;
    
    std::cout << "Enter a fraction";
    std::cin >> num2 >> ignore >> den2;
    
    std::cout << "The two fractions multiplied:"
       	<< num1 * num2 << '/' << den1 * den2 << '\n';
    
    return 0;
}
```

运行程序，我们会得到

```
Enter a fraction: 1/2
Enter a fraction: 3/4
The two fractions multiplied: 3/8
```

虽然这个程序看起来是有效的，但是有很多可以深究的问题。首先，组成分数的一对整数只是松散地联系在一起。另外函数只能返回单个值，我们应该如何将分子和分母都返回出来呢？

显然，使用基本数据类型已经无法满足我们的需求了

#### Compound data types

C++支持复合数据类型，是从基本数据类型以及其他复合数据类型中构造的数据类型。C++支持的复合数据类型包括以下：

- 函数
- 数组
- 指针
  - 指向物体的指针
  - 指向函数的指针
- 指向成员的指针
  - 指向数据成员的指针
  - 指向成员函数的指针
- 引用
  - 左值引用
  - 右值引用
- 枚举
  - 无作用域枚举
  - 有作用域的枚举
- Class
  - 结构体
  - 类
  - 联合体
