---
title: Ch14 Introduction to Classes
date: 2024-08-22 15:26 +0800
categories: [Codes, Learn C++]
---

### 14.1 Introduction to object-oriented programming

略

---

### 14.2 Introduction to classes

首先我们来了解不变量**invariant**这个概念。它是指在程序执行过程中保持恒定的条件或属性。而类不变量则是指类的每个公共成员函数调用之前和之后应始终成立的条件。它们用于确保对象始终处于有效状态。。例如，如果一个类代表一个时间点，类不变量可能会要求小时数应在0到23之间，分钟数应在0到59之间。

```c++
class Time {
public:
    Time(int h, int m) : hour(h), minute(m) {
        assert(hour >= 0 && hour < 24);
        assert(minute >= 0 && minute < 60);
    }

    void setTime(int h, int m) {
        hour = h;
        minute = m;
        assert(hour >= 0 && hour < 24);
        assert(minute >= 0 && minute < 60);
    }

private:
    int hour;
    int minute;
};

```

在上述代码的例子中，`hour`和`minute`的有效范围是类的不变量。

此前，我们对结构体做了详细的了解，结构体有一个明显的问题就是因为`struct`通常用于简单数据结构，且成员默认是`public`的，因此很容易导致不变量得不到维护。我们考虑下面这段代码：

```c++
struct Fraction
{
    double numerator;
    double denominator;
};
```

在`Fraction`中，`denominator`不应该为`0`。

---

### 14.3 Member functions

在编程中，我们通过变量来表示属性，通过函数表示操作。而在C++中，我们可以将属性与操作定义在一起，这就是类，包括结构体、class、联合体，也就是说，类除了拥有成员变量，同样可以拥有成员函数

成员函数必须在类的内部声明，但是函数定义可以在任意位置上。简单起见，我们暂时在内部定义成员函数

---

### 14.4 Const class objects and const member functions

#### Const objects may not call non-const member functions

如果一个类对象是const，那么就不能调用类中的非常量成员函数，例如：

```c++
struct Date
{
    int year;
    int month;
    int day;

    void print()
    {
        std::cout << year << "/" << month << "/" << day << '\n';
    }
};

int main()
{
    const Date today {2020, 04, 21};
    today.print(); // ERROR!
}
```

#### Const member functions

为了解决这个问题，我们可以将`print`函数也改为`const`

```c++
void print() const
{
    std::cout << year << "/" << month << "/" << day << '\n';
}
```

#### Const member functions may be called on non-const objects

非常量的类对象可以调用常量成员函数

---

### 14.5 Public and private members and access specifiers

C++有三种访问等级：`public`、`private`、`protected`。在本小节中，我们先来了解前两个

`public`成员没有任何访问限制，只要在同一个作用域中。而`private`则只能被同一个类中其他成员访问。

当一个类有了`private`成员后，就不再是一个聚合体了，也就不能在使用聚合体初始化。

#### Naming your private member variables

在C++中，一个通常的惯例是，以`m_`为前缀命名私有成员变量。

---

### 14.6 Access functions

略

---

### 14.7 Member functions returning references to data members

略

---

### 14.8 The benefits of data hiding (encapsulation)

略

---

### 14.9 Introduction to constructors
