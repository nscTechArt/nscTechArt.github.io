---
layout: page
permalink: /blogs/Codes/CSharp中的out和ref/index.html
title: C#中out和ref的使用
---

### C#中out和ref的使用

在C#，`ref`和`out`关键字都用于传递参数引用，而不是值。尽管在某些方面很相似，但它们之间还是有一些关键区别的。

1. **初始化**：在调用方法之前，使用`ref`作为修饰符的参数必须先初始化。然而，使用`out`参数时，不需要进行初始化，默认会在方法中进行

   ```c#
   void ExampleRef(ref int a) {
       a += 1; // 使用ref修饰符，输入参数必须初始化
   }
   
   void ExampleOut(out int a) {
       a = 10; // 使用out修饰符，输入参数可以不需要初始化，但必须在方法内部赋值
   }
   ```

2. **赋值**：ref和out都能在方法中改变参数的值，并将改变的值带出方法。不过，使用out修饰符的参数必须要在方法中被赋值，否则就会编译错误

   ```c#
   void ExampleRef(ref int a) {
       // do nothing
   }
   
   void ExampleOut(out int a) {
       a = 10; // 必须在方法内部赋值
   }
   ```

#### 总结

- `ref`主要在需要修改已初始化的变量时使用
- `out`通常在想要在方法内初始化并返回一个新的对象时使用