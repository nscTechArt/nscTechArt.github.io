---
title: Ch13 Compound Types Enums and Structs
date: 2024-07-23 09:26 +0800
categories: [Codes, Learn C++]
---

### 13.1 Introduction to user-defined types

基础类型是C++设计中的核心部分，我们可以直接在代码中使用基础类型，例如：

```c++
int x;
double d;
```

C++中也有通过对基础类型拓展得到的复合类型，包括函数、指针、引用、数组等：

```cpp
void fcn(int) {};
int* ptr;
int& ref {x};
int arr[5];
```

C++允许复合类型的存在，是因为基础类型对于C++来说是已知的，所以我们无需再为复合类型提供或导入任何定义。

我们此前也了解了类型别名这个概念，也就是为已经存在的类型提供一个新的标识符，例如：

```c++
using length = int;
```

如果我们在此处忽略了对于length的定义，那么编译器就无法知道length的含义。

#### What are user-defined types?

此前，我们讨论过如何在C++中表示一个分数。C++没有内置的分数类型，并且也无法通过简单类型来表示分数。所以C++为我们提供了复合类型，其中有两种类型可以用于创建user-defined/program-defines类型：

- 枚举类型（包括有范围的枚举和无范围的枚举）
- class类型（包括结构体、类、联合体）

#### Defining program-defined types

下面是一个结构体定义与实例化的例子：

```c++
struct Fraction
{
    int numerator {};
    int denominator {};
};

int main()
{
    Fraction f {3, 4};
}
```

在上面这段代码中，我们使用关键词`struct`定义了一个结构体类型。定义`Fraction`并不会让编译器为其分配任何内存，定义的作用是让编译器知道`Fraction`是什么。在`main()`函数中，我们实例化并初始化了`Fraction`类型的一个变量`f`，同时分配了内存。

#### Using program-defined types throughout a multi-file program

在单个源文件的程序中使用program-defined类型时，应该让program-defined类型的定义尽可能靠近该类型的第一次使用点。

而在多个源文件的程序中使用program-defined类型时，通常我们会在头文件中实现其定义，然后在需要使用program-defined类型的文件中使用`#include`指令引入对应的头文件。

---

### 13.2 Unscoped enumerations

在深入了解枚举类型之前，我们先通过一个例子来看看为什么引入枚举类型是必要的。

在某个程序中，我们需要知道一个苹果是什么颜色的，红色、黄色、还是绿色。如果只使用基础类型，我们可能会通过某种隐式映射来实现，例如0表示红色、1表示黄色、2表示绿色：

```c++
int appleColor {0}; // red apple
```

这样的代码并不直观，而且在C++程序中我们应该尽可能避免在表达使用使用magic number。所以我们可以更新一步的优化，同时使用类型别名让代码更易读：

```c++
using Color = int; // define a type alias named Color

// The following color values should be used for a Color
constexpr Color red{ 0 };
constexpr Color green{ 1 };
constexpr Color blue{ 2 };

int main()
{
    Color appleColor{ red };
}
```

但是，Color只是int类型一个别名，我们仍然无法避免强制使用这些颜色符号常量的问题。例如，有可能使用这种语法正确但语义上没有意义的代码：

```c++
Color eyeColor {8}; // what does 8 mean
```

所以，这就是为什么要使用program-defined类型。

#### Enumerations

枚举是一种复合数据类型，其值仅限于一组有命名的代表特定意义的常量，其中这些常量被称为枚举数。

C++中的枚举类型分为两种：不限定作用域的枚举和限定作用域的枚举

#### Unscoped enumerations

不限定作用域的枚举类型通过`enum`关键词定义，我们来看下面这个例子：

```c++
enum Color
{
    red, green, blue,
};

int main()
{
    Color apple {red};
    Color shirt {green};
    Color cup {blue};
    // but the followings are wrong!
    Color socks {white};
    Color hat {2};
}
```

枚举类型的初始化必须使用该类型定义的枚举数，否则就会导致编译错误。

枚举数是隐式的`constexpr`。

#### Enumerated types are distinct types

我们在程序中创建的枚举类型彼此之间都被视为不同的类型，也就是会被编译器区分开。

基于此，一个枚举类型所定义的枚举数无法用在其他枚举类型的对象中，例如：

```c++
enum Pet 
{
    cat, dog, pig, whale,
};

enum Color 
{
    black, red, blue,
};

int main()
{
    Pet myPet {black}; // compile error: black is not an enumator of Pet
}
```

#### The scope of unscoped enumerations

无作用域枚举之所以这样命名，是因为它们将枚举数放在与枚举定义本身相同的作用域中，而不是像命名空间那样创建新的作用域。比如下面这个例子：

```c++
enum Color // this enum is defined in the global namespace
{
    red, // so red is put into the global namespace
    green,
    blue,
};
```

实际上，这样的做法会污染全局作用域，并且增加了命名冲突的风险。比方说，不限定作用域的枚举类型中，不能使用相同命名的枚举数：

```c++
enum Color
{
    red,
    green,
    blue, // blue is put into the global namespace
};

enum Feeling
{
    happy,
    tired,
    blue, // error: naming collision with the above blue
};
```

不限定作用域的枚举类型实际上也为它们的枚举数提供了一个命名作用域范围，所以我们也可以枚举类型的命名来访问枚举数，例如：

```c++
enum Color
{
    red,
    green,
    blue, // blue is put into the global namespace
};

int main()
{
    Color apple { red }; // okay, accessing enumerator from global namespace
    Color raspberry { Color::red }; // also okay, accessing enumerator from scope of Color
}
```

只不过对于不限定作用域的枚举来说，我们可以直接访问，而不是用`::`

#### Avoiding enumerator naming collisions

有一些方法可以帮助我们避免不限定作用域的枚举数命名冲突。

第一种方式是为枚举数添加对应枚举类型的命名作为前缀：

```c++
enum Color
{
	color_red, color_white, color_blue, 
};
enum Feeling
{
	feeling_happy, feeling_tired, feeling_blue,
};
```

但是这种做法本质上仍然会污染命名空间。所以更好的做法是将枚举类型的定义放某个特定作用域的空间内，比如命名空间，例如：

```c++
namespace Color
{
    enum Color
    {
        red, green, blue,
    };
}

namespace Feeling
{
    enuma Feeling
    {
        happy, tired, blue,
    };
}
```

当然，class也可以提供一个作用域范围，所以我们也可以在class中定义枚举类型。

或者，如果一个枚举只在某个函数中使用，那么我们最好将该枚举放在对应的函数中。

#### Comparing against enumators

我们可以通过等式运算符判断一个枚举变量是否有特定的枚举值：

```c++
enum Color
{
	red, green, blue,    
};

int main()
{
    Color shirt {blue};
    if (shirt != blue)
        std::cout << "The shirt is not blue" << '\n';
}
```

---

### 13.3 Unscoped enumerator integral conversions

在枚举类型中，我们已经知道枚举数是有特定意义的常量，但实际上枚举数具有整数类型的值。这种特性与`char`类似：

```c++
char ch {'a'};
```

一个`char`实际上是一个1字节的整数值，字符`a`会被转换为一个整数值并被存储。

当我们定义一个枚举时，根据枚举数在枚举中的位置，会被自动分配一个整数值。第一个枚举数的值为`0`，其余枚举数按顺序递增。例如：

```c++
enum Color
{
    black,   // 0
    red,     // 1
    blue,    // 2
    green,   // 3
    white,   // 4
    cyan,    // 5
    yellow,  // 6
    magenta, // 7
};

int main()
{
    Color shirt{ blue }; // shirt actually stores integral value 2
}
```

我们也可以显式地为枚举数指定整数值，该值可以是正数也可以是负数，不同枚举数还可以使用相同的值。没有被指定数值的枚举数则会在前一个枚举数的值上加一。例如：

```c++
enum Animal
{
    cat = -3,    // values can be negative
    dog,         // -2
    pig,         // -1
    horse = 5,
    giraffe = 5, // shares same value as horse
    chicken,     // 6
};
```

在上面这段代码中，`horse`和`giraffe`具有相同的值，那么这两个枚举数在本质上是同一的，可以在代码中相互替换。虽然C++允许这样的代码，但是我们在开发过程中要尽量避免。

此外，除非有特定的理由，我们最好不用显式地为枚举数指定数值。

#### Unscoped enumerations will implicitly convert to integral values

虽然枚举数存储的是整数值，但它们实际上是复合类型，而非整数类型。只不过，对于不限定作用域的枚举来说，会被隐式地转换为整数类型。因为枚举数是compile-time的常数，所以该转换是constexpr转换。

我们考虑下面这个例子：

```c++
#include <iostream>

enum Color 
{
    black, red, white,
};

int main()
{
    Color apple {red};
    std::cout << "The apple is " << apple << '\n';
}
// prints: The apple is 2
```

当枚举类型用在函数调用中，或通过运算符使用枚举类型时，编译器会首先尝试找到与枚举类型相匹配的函数或运算符。在我们的例子中，当编译`std::cout << apple`时，编译器会首先检查运算符`<<`是否知道如何输出一个`Color`对象到`std::cout`中。结果是运算符`<<`并不知道。

所以，编译器会转而检查运算符`<<`是否知道如何输出由枚举类型转换而得到的整数类型的对象，显然是可以的，所以`apple`的值会转换为整数值，并最终输出`2`

#### Enumeration size and underlying type (base)

枚举数具有整数类型的值，但具体是什么类型呢？枚举数的值所使用的特定类型被称为枚举的**underlying**类型（或称为**base**）。

对于不限定作用域的枚举来说，C++并不会明确指定出枚举数所使用的类型。大多数编译器会使用`int`作为underlying类型。

我们可以显式地指定枚举的underlying类型，只要该underlying类型是整数类型。比如，我们在实现一个带宽敏感的程序（比方说通过网络传递数据的程序），我们可能会需要使用一个较小的类型：

```c++
#include <cstdint>  // for std::int8_t
#include <iostream>

// Use an 8-bit integer as the enum underlying type
enum Color : std::int8_t
{
    black,
    red,
    blue,
};

int main()
{
    Color c{ black };
    std::cout << sizeof(c) << '\n'; // prints 1 (byte)
}
```

但大多数情况下，除非有特定的原因，我们无需指定underlying类型。

#### Integer to unscoped enumerator conversion

编译器会隐式地将不限定作用域的枚举转换为整数，但整数无法隐式地转换为枚举，例如下面的程序就会导致编译错误：

```c++
enum Pet // no specified base
{
    cat, // assigned 0
    dog, // assigned 1
    pig, // assigned 2
    whale, // assigned 3
};

int main()
{
    Pet pet { 2 }; // compile error: integer value 2 won't implicitly convert to a Pet
    pet = 3;       // compile error: integer value 3 won't implicitly convert to a Pet
}
```

不过我们可以通过其他方式来实现这样的需求。

首先，我们可以使用`static_cast`将一个整数显式地转换为不限定作用域的枚举：

```c++
int main()
{
    Pet pet {static_cast<Pet>(2)};
    pet = static_cast<Pet>(3);
}
```

或者，在C++17后，如果一个不限定作用域的枚举类型具有一个特定underlying类型，则编译器允许我们使用对应的整数值来进行列表初始化：

```c++
enum Pet: int
{
	cat,
    dog,
    pig,
};

int main()
{
    Pet pet1 {2}; // okay: can brace intialize unscoped enumeration with specified base with integer
    Pet pet2 (2); // error: cannot direct intialize with integer
    Pet pet3 = 2; // error: cannot copy initialize with integer
    pet1 = 3;     // error: cannot assign with integer
}
```

---

### 13.4 Converting an enumeration to and from a string

我们先来回顾下面这个例子：

```c++
#include <iostream>

enum Color
{
    black, // 0
    red,   // 1
    blue,  // 2
};

int main()
{
    Color shirt{ blue };
    std::cout << "Your shirt is " << shirt << '\n';
}
```

运算符`<<`不知道如何将一个`Color`对象输出到`std::cout`中，所以最终会将`shirt`转换为整数值并输出。

但是大多数情况下，我们肯定是不希望枚举数作为int值输出，这样有违我们使用枚举类型的初衷。

#### Getting the name of an enumerator

获取枚举数命名的传统方法是，实现一个函数，允许我们传递一个枚举数，然后以字符串形式返回枚举数的命名。但这需要某种方法来确定为给定枚举数返回哪个字符串。

这里有两种方法来实现。第一种方法是使用`switch`：

```c++
#include <iostream>
#include <string_view>

enum Color
{
    black, red, blue,
};

constexpr std::string_view getColorName(Color color)
{
    switch (color)
    {
    case black: return "black";
    case red: return "red";
    case blue: return "blue";
        default: return "???";
    }
}

int main()
{
    constexpr Color shirt {blue};
    std::cout << "The shirt is " << getColorName(shirt) << '\n';
}
```

因为我们实现的函数是constexpr，所以我们可以在一个常量表达式中使用`Color`对象的命名。

第二种方法我们将在后面提到。

#### Unscoped enumerator input

我们考虑下面这个程序：

```c++
#include <iostream>

enum Pet
{
    cat,   // 0
    dog,   // 1
    pig,   // 2
    whale, // 3
};

int main()
{
    Pet pet { pig };
    std::cin >> pet; // compile error: std::cin doesn't know how to input a Pet
}
```

在这个例子中，因为Pet是program-defined类型，所以编译器不知道如果通过`std::cin`输入一个`Pet`对象。

一个简单的解决办法是输入一个整数值，然后通过`static_cast`显式转换到枚举类型：

```c++
#include <iostream>
#include <string_view>

enum Pet
{
    cat,   // 0
    dog,   // 1
    pig,   // 2
    whale, // 3
};

constexpr std::string_view getPetName(Pet pet)
{
    switch (pet)
    {
    case cat:   return "cat";
    case dog:   return "dog";
    case pig:   return "pig";
    case whale: return "whale";
    default:    return "???";
    }
}

int main()
{
    std::cout << "Enter a pet (0=cat, 1=dog, 2=pig, 3=whale): ";

    int input{};
    std::cin >> input; // input an integer

    if (input < 0 || input > 3)
        std::cout << "You entered an invalid pet\n";
    else
    {
        Pet pet{ static_cast<Pet>(input) }; // static_cast our integer to a Pet
        std::cout << "You entered: " << getPetName(pet) << '\n';
    }
}
```

虽然这种方法可行，但是也有些繁琐。

#### Getting an enumeration from a string

与其输入一个意义相对不明确的数字，不如直接输入一个表达枚举数的字符串，比如"pig"，然后将该字符串转换为对应的枚举数。但是这种思路需要我们解决一些问题。

首先，我们无法对字符串使用`switch`语句，所以我们需要使用其他方式来匹配用户输入的字符串。最简单的方法是使用一系列`if`语句。

其次，如果用户输入了无效的字符串，我们应该转换为什么`Pet`对象呢？我们可以添加一个表示`none`的枚举数，但是最好的方法是使用`std::optional`

下面是我们实现的程序：

```c++
#include <iostream>
#include <optional> // for std::optional
#include <string>
#include <string_view>

enum Pet
{
    cat,   // 0
    dog,   // 1
    pig,   // 2
    whale, // 3
};

constexpr std::string_view getPetName(Pet pet)
{
    switch (pet)
    {
    case cat:   return "cat";
    case dog:   return "dog";
    case pig:   return "pig";
    case whale: return "whale";
    default:    return "???";
    }
}

constexpr std::optional<Pet> getPetFromString(std::string_view sv)
{
    if (sv == "cat")   return cat;
    if (sv == "dog")   return dog;
    if (sv == "pig")   return pig;
    if (sv == "whale") return whale;

    return {};
}

int main()
{
    std::cout << "Enter a pet: cat, dog, pig, or whale: ";
    std::string s{};
    std::cin >> s;

    std::optional<Pet> pet { getPetFromString(s) };

    if (!pet)
        std::cout << "You entered an invalid pet\n";
    else
        std::cout << "You entered: " << getPetName(*pet) << '\n';
}
```

---

### 13.5 Introduction to overloading the I/O operators
