---
layout: page
permalink: /blogs/Codes/LearnCPP/12-13/index.html
title: In and out parameters
---

### In and out parameters

---

函数与函数调用通过两种机制相互通信：parameter和返回值。函数调用时，我们为函数提供arguments，函数通过函数的parameters接收arguments，这些arguments可以通过按值、按引用、按地址的形式传递。

通常情况下，我们会通过按值或按const引用的方式传递arguments，但是有时我们还会借助别的形式。



大多数情况下，函数的parameter仅仅用于接收函数调用的输入值。这样的parameter我们将其称为**in-parameter**。例如下面这个程序中，参数`x`和参数`s`都是in-parameter：

```c++
#include <iostream>

void print(int x)
{
	std::cout << x << '\n';
}

void print(const std::string& s)
{
	std::cout << s << '\n';
}

int main()
{
	print(5);
	std::string s {"Hello"};
	print(s);
	
	return 0;
}
```

**in-parameter通常使用按值和按const引用的方式传递**



通过非const引用或地址传递的函数arguments，可以允许函数修改作为argument传递的对象的值。这为函数提供了一个方法，以便于在返回值不够用的情况下将数据返回给函数调用。被仅仅用于向函数调用返回信息的函数parameter被称为**out-parameters**。下面是一个例子

```c++
#include <cmath>
#include <iostream>

void getSinCos(double degrees, double& sinOut, double& cosOut)
{
	// sin() and cos() take radians, not degrees, so we need to convert
	constexpr double pi {3.1415926};
	double radians = degrees * pi / 180.0;
	sinOut = std::sin(radians);
	cosOut = std::cos(radians);
}

int main()
{
	double sin {0.0};
	double cos {0.0};
	
	double degrees{};
	std::cout << "Enter the number of degrees";
	std::cin >> degrees;
	
	// getSinCos will return the sin and cos in variables sin and cos
    getSinCos(degrees, sin, cos);
    
    std::cout << "The sin is " << sin << '\n';
    std::cout << "The cos is " << cos << '\n';
    
    return 0;
}
```

在这个示例中，函数`getSinCos`有三个参数，其中`degrees`通过值传递，作为输入，并“返回”两个参数通过引用传递，作为输出。

在函数定义中，我们用后缀`Out`命名两个out-parameters，以表示它们属于out参数。这有助于提醒函数调用：传递给这两个参数的初始值无关紧要，在函数中是要被覆盖的。



out参数也有一些缺点

首先，函数调用必须实例化并初始化对象，然后将它们作为arguments传递。这意味我们无法将其指定为常量。其次，由于函数调用必须传入对象，因此这些值不能用作临时值，也无法在单个的表达式中轻松地使用。我们结合下面的代码示例来理解out参数的缺点：

```c++
#include <iostream>

int getByValue()
{
	return 5;
}

void getByReference(int& x)
{
	x = 5;
}

int main()
{
	// return by value
	[[maybe_unused]] int x {getByValue()};  // can use to initialize object
	std::cout << getByValue() << '\n';      // can use temporary return value in expression
	
	// return by out parameter
	int y {};                // must first allocate an assignable object
	getByReference(y);       // then pass to function to assign the desired value
	std::cout << y << '\n';  // and only then can we use that value
	
	return 0;
}
```

可以看出来，out参数的语法有些不那么自然

