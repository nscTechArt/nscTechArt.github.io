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

此前，我们使用了一个函数，用于将枚举转换为对应的字符串：

```c++
#include <iostream>
#include <string_view>

enum Colors
{
    red, blue, yellow,
};

constexpr std::string_view printColors(Colors color)
{
    switch (color)
    {
        case red : return "red";
        case blue : return "blue";
        case yellow : return "yellow";
        default: return "???";
    }
}

int main()
{
    constexpr Colors shirt{red};

    std::cout << printColors(shirt) << '\n';
}
```

但是这样的实现方法是有缺点的：

- 在输出时，我们需要记住用于转换枚举数函数的命名，在我们的例子中，是`printColors`
- 在`cout`中调用函数不够简洁

#### Introduction to operator overloading

之前，我们学习过函数重载，在C++中，我们同样可以重载运算符，实现的步骤如下：

1. 用运算符作为函数的命名，定义一个新的函数
2. 为运算符的运算数添加合适的形参，其中一个形参必须要用户自定义的类型，否则无法通过编译
3. 根据需要设置返回类型
4. 通过返回语句，返回所需要的运算结果

#### Overloading `operator<<` to print an enumerator

现在，我们实现一个运算符重载，使得`<<`能够输出枚举数。但是在实现之前，我们先来了解一下`<<`的使用机制。

我们考虑这样一个简单的表达式`std::cout << 5`。其中`std::cout`的类型是`std::ostream`，这是在标准库中用户定义类型，`5`的类型是`int`

当编译开始后，编译器会尝试寻找重载的`operator<<`函数，且该函数的返回类型为`std::ostream`，实参类型为`int`。随后编译器会在标准库中找到这样的重载函数，接着编译器会对该函数进行调用。

有了一定的理解后，我们就可以尝试实现我们自己的重载了。

```c++
#include <iostream>
#include <string_view>

enum Colors
{
    red, blue, yellow,
};

constexpr std::string_view printColors(Colors color)
{
    switch (color)
    {
    case red : return "red";
    case blue : return "blue";
    case yellow : return "yellow";
    default: return "???";
    }
}

std::ostream& operator<< (std::ostream& cout, Colors color)
{
    cout <<  printColors(color);
    return cout;
}

int main()
{
    constexpr Colors shirt{red};
    std::cout << shirt;
}
```

#### Overloading `operator>>` to input an enumerator

下面这个例子中，我们重载了运算符>>用于输入一个枚举数。

```c++
#include <iostream>
#include <optional>

enum Color
{
    red, green, blue,
};

std::string_view getColorName(Color color)
{
    switch (color)
    {
    case red:   return "red";
    case green: return "green";
    case blue:  return "blue";
    }
    return "Unknown Color";
}

std::optional<Color> getColorFromString(std::string_view sv)
{
    if (sv == "red") return red;
    if (sv == "green") return green;
    if (sv == "blue") return blue;
    return {};
}

std::ostream& operator<< (std::ostream& out, Color color)
{
    out << getColorName(color);
    return out;
}

std::istream& operator>> (std::istream& in, Color& color)
{
    std::string s;
    in >> s;

    std::optional colorMatched = getColorFromString(s);
    if (colorMatched)
    {
        color = *colorMatched;
        return in;
    }

    in.setstate(std::ios::failbit);
    return in;
}

int main()
{
    Color color{};
    std::cout << "Pick a Color: red, green, or blue" << '\n';
    std::cin >> color;
    if (std::cin) std::cout << color;
    else
    {
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        std::cout << "No matching color\n";
    }
}
```

---

### 13.6 Scoped enumerations  (enum classes)

现在我们已经对unscoped枚举有了一些了解，unscoped枚举具有下面这些缺点：

- **命名冲突**。unscoped枚举的枚举成员在其声明的作用域中没有封装，会造成命名空间污染的问题，有可能与其他标识符冲突，例如：

  ```c++
  enum Colors { RED, GREEN, BLUE };
  enum TrafficLights { RED, YELLOW, GREEN }; // 与Colors中的RED和GREEN冲突
  ```

- **类型不安全**：Unscoped 枚举的枚举成员隐式转换为整型，这可能导致意外的类型不匹配和错误。例如：

  ```c++
  enum Colors { RED, GREEN, BLUE };
  int color = RED; // 隐式转换为int
  ```

故C++还提供了另一种枚举类型，也就是有作用域的枚举，也被称为enum class。scoped枚举与unscoped枚举有两个主要区别：

- 不会将枚举成员隐式地转换为整数值
- 枚举成员的作用域仅限于在枚举类型内，而不会与其他枚举类型或变量冲突。

下面一个scoped枚举类型的例子：

```c++
enum class color 
{
	red, white, green, blue,
};
```

由于scoped枚举的性质，当我们使用枚举成员时，需要通过枚举类型来访问枚举成员，如同命名空间一样：

```c++
int main()
{
    enum class color 
    {
        red, white, green, blue,
    };
    
    Color color {Color::red};
}
```

在scoped枚举类型中，虽然枚举成员不再会被隐式地转换为整数值，但是我们仍然可以比较同一个枚举类型中成员，例如：

```c++
#include <iostream>

int main()
{
    enum class Color
    {
        red, white, green,
    };

    Color shirt = {Color::red};
    if (shirt == Color::red) std::cout << "Cool\n";
}
```

此外，我们也可以显式地转换枚举成员，例如：

```c++
std::cout << static_cast<int>(shirt);
```

而且，我们可以同样使用`static_cast`将枚举成员转换为整数值，这在处理输入问题中很有用：

```c++
#include <iostream>

int main()
{
    enum class Color
    {
        red, white, green,
    };

    int input{};
    std::cin >> input;
    Color color{static_cast<Color>(input)};
}
```

在C++17后，我们可以直接转换，而不是用`static_cast`：

```c++
Color color{1};
```

C++23提供了另一种方法，使用std::to_underlying将枚举成员转换为枚举类型的底层类型对应的值：

```c++
std::cout << std::to_underlying(color) << '\n';
```

#### Easing the conversion of scoped enumerators to integers (advanced)

在scoped枚举类型中，虽然枚举成员不再会被隐式地转换为整数值，但是有些情况下，频繁使用`static_cast`进行显示转换也会带来某些不便，一种解决方法是重载运算符来执行转换：

```c++
#include <iostream>

enum class Color
{
    red, yellow, blue, green,
};

constexpr auto operator+(Color color) noexcept
{
    return static_cast<std::underlying_type_t<Color>>(color);
}

int main()
{
    std::cout << +Color::green << '\n';
}
```

---

### 13.7 Introduction to structs, members, and member selection

结构体的定义如下：

```c++
struct Employee
{
    int id {};
    int age {};
    double wage {};
};
```

基础用法很简单，这里就不讨论了

---

### 13.8 Struct aggregate initialization

默认情况下，结构体的成员变量是未被初始化的。

#### What is an aggregate

在计算机程序中，聚合数据类型指的是是由多个元素组成的数据类型，这些元素可以是不同类型的变量，但作为一个整体可以被看作一个单一的实体。在C++和其他一些编程语言中，聚合数据类型通常包括结构体（`struct`）、数组、类（`class`）等。
