### Item 5: Know what functions C++ silently writes and calls

对于一个空类来说，编译器会自动声明出下列被`public`与`inline`修饰的函数：

- 默认构造函数
- 拷贝构造函数
- 拷贝赋值运算符重载
- 析构函数

下面是一个例子，当我们定义出下面这样的一个空类：

```c++
class Empty {};
```

实际上就等同于：

```c++
class Empty
{
    Empty() = default;
    ~Empty() = default;
    
    Empty(const Empty& rhs) {...}
    Empty& operator=(const Empty& rhs) {...}
};
```

需要注意的是，这些函数只有在被调用时才会被编译器创建出来。

---

### Item 6: Explictly disallow the use of compiler-generated functions you do not want

特定用途下，有些类不应该支持拷贝构造以及拷贝赋值运算符，例如一个描述待售房屋的类：

```c++
class HomeForSale {...};
```

如果我们不希望某个类使用特定的功能，我们不声明对应的函数即可，但是编译器会为类自动生成拷贝构造函数与拷贝赋值运算符，所以下面这几行代码可以通过编译：

```c++
HomeForSale h1;
HomeForSale h1;
HomeForSale h3(h1);
h1 = h2;
```

所有编译器创建的函数都是`public`，所以解决问题的思路是，我们自行声明出这些函数，同时声明为`private`，这样就实现两个目的：

- 避免编译器自行创建函数
- `private`修饰符避免了这些函数被调用。

例如：

```c++
class HomeForSale
{
public:
    ...
private:
    ...
    HomeForSale(const HomeForSale&);
    HomeForSale& operator=(const HomeForSale&);
};
```

在这种方法下，我们无需写出参数的名称，毕竟这些函数不会被实现。

还有一种方法，我们声明一个专门用于阻止拷贝构造与拷贝赋值的基类，HomeForSale只需要继承自该类即可：

```c++
class Uncopyable
{
protected:
    Uncopyable() {}
    ~Uncopyable() {}
private:
    Uncopyable(const Uncopyable&);
    Uncopyable& operator=(const Uncopyable&);
};

class HomeForSale: private Uncopyable
{
    ...
};
```

---

### Item 7: Declare destructors virtual in polymorphic base classes

