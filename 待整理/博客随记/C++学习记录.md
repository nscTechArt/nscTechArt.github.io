### 非显式转换构造函数

#### 问题

定义了一个`Vec3`的类，其中有一个构造函数被编译器警告为“非显式转换构造函数”

```c++
template<typename T>
class Vec3
{
public:
    Vec3() : x(T(0)), y(T(0)), z(T(0)) {}
    Vec3(const T &xx) : x(xx), y(xx), z(xx) {}
    Vec3(T xx, T yy, T zz) : x(xx), y(yy), z(zz) {}
    T x, y, z;
};
using Vec3f = Vec3;
```
{: add-lines="6"}

#### 解释

在C++中，非显式的构造函数允许隐式转换，假如说我有一个函数`foo`，它接受`Vec3f`类型的参数，那么我们可以这样调用`foo`：

```c++
void foo(Vec3f& v);

foo(0.5f);
```

这种情况下，编译器会隐式地使用`Vec3(const T& xx)`构造函数来创建一个`Vec3f`对象。这种隐式转换有可能导致意外的结果。我们可以将构造函数声明为`explicit`来告诉编译器，只能通过显式调用来使用该构造器。

---

### 纯虚函数

看下面这个类的定义：

```c++
class Shape
{
public:
    Shape() : color(randomZeroToOne(), randomZeroToOne(), randomZeroToOne()) {};
    virtual ~Shape() = default;

    virtual bool intersect(const Vec3f&, const Vec3f&, float&) const = 0;

    virtual bool getSurfaceData(const Vec3f&, Vec3f&, Vec2f&) const = 0;

    Vec3f color;
};
```

其中，两个虚函数的声明中包含 `= 0`，用于声明一个纯虚函数，表示这个函数在基类`Shape`中没有实现，任何派生类都必须提供这些函数的实现。

同时， `= 0`也使得Shape类成为了一个抽象类，不能直接实例化，只能作为其他类的基类。派生类需要实现所有纯虚函数才能创建对象。

---

### Static总结

`static`有三种含义，我们可以根据`static`的修饰范围做区分：

- 成员变量：`static`表示全局统一，与实例无关
- 成员函数：`static`表示全局统一，与实例无关
- 全局变量：本质是`inner`，表示只在本编译单元生效，不能跨文件使用
- 普通函数：本质是`inner`，表示只在本编译单元生效，不能跨文件使用
- 局部变量：修改了变量的生命周期，一直持续到程序结束。

---

