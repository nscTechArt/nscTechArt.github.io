### Item 1: View C++ as a federation of languages

我们可以将C++分为四个部分：

- C
- Object-Oriented C++
- Template C++
- STL

---

### Item 2: Prefer `consts`, `enums`, and `inlines` to `#define`

我们可以这样理解：编译器优先于预处理器。原因主要与编译时错误检测、类型安全、作用域控制等有关

- **编译器错误检测：**

  - #`define`是预处理器指令，编译器在处理这些宏无法进行类型检查。这意味着任何潜在的错误可能只会在预处理器阶段后才出现，导致难以排查。
  - 而`const`、`enum` 和 `inline` 这些关键词允许编译器在编译时检查类型和语法错误，从而减少潜在的错误。

- **类型安全：**

  - `#define` 只是简单的文本替换，没有类型信息。例如：

    ```c++
    define ASPECT_RATIO 1.653
    ```

    这个宏在代码中只是替换为数字 `1.653`，并没有类型信息。如果在需要类型的上下文中使用，例如与不同类型的变量混合使用，可能会导致难以调试的错误。

  - 使用 `const` 关键字，可以确保常量有明确的类型：

    ```c++
    const double ASPECT_RATIO = 1.653
    ```

- **作用域控制：**
  - `#define` 宏没有作用域的概念，一旦定义后在整个文件中都有效，可能导致意外的冲突和不可预期的替换。
  - `const` 和 `enum` 等常量定义在相应的作用域中，作用域控制更加明确，避免了命名冲突的问题。

- **C++特性支持：**
  - `enum` 可以用于定义有意义的枚举类型，而不是仅仅是简单的文本替换。
  - `inline` 函数相对于宏函数，支持类型检查和语法检查，并且可以访问类的私有成员。	

---

### Item 3: Use `const` Wherever Possible

- 使用`const`可以帮助编译器检测用法的正确性。`const`可以用于任何作用域的对象、函数形参、返回类型，以及成员函数。
- 当`const`和非`const`的成员函数有着实质等价的实现时，令非`const`版本调用`const`版本可避免代码重复。

---

### Item 4: Make sure that objects are initialized before thet're used

读取没有初始化的值会导致未定义的行为。

我们要践行的是，在使用对象前，始终确保对象已完成初始化。

- 对于基础类型的非成员变量来说，我们需要手动进行初始化。例如：

  ```c++
  int x = 0;
  const char* text = "A C-style String";
  ```

- 而其他情况下，初始化则会由构造器负责实现。

