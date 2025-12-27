<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/zernonia/supabase-schema">
    <img src="src/assets/logo.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Supabase Schema</h3>

  <p align="center">
    Secured & Simple <strong><a href="https://supabase.io/">Supabase</a> Schema Visualizer.</strong>
    <br />
    No installations • No Database password required.
    <br />
    <br />
    <a href="https://supabase-schema.vercel.app/">View Demo</a>
    ·
    <a href="https://github.com/zernonia/supabase-schema/issues">Report Bug</a>
    ·
    <a href="https://github.com/zernonia/supabase-schema/issues">Request Feature</a>
  </p>
</p>

![Supabase Schema](images/main.png)

## 🚀 Features

- 🔨 No installations
- 🔒 Persistent State in LocalStorage
- 🚪 Login-less
- 👀 No Sensitive info required
- 🤚 Moveable Schema for own design
- 🔗 Visual relationship creation with drag & drop
- 🔐 Strict & Flexible connection modes

## 🔗 Connection Modes

When creating relationships between tables by dragging from one column to another, you can choose between two modes using the lock button in the top-right toolbar of the app:

### 🔓 Flexible Mode (Unlock Icon)

In Flexible Mode, you can connect **any column to any column** without type restrictions. This is useful when:
- You want to quickly sketch out relationships
- You're working with custom types or extensions
- You need maximum flexibility in your schema design

### 🔐 Strict Mode (Lock Icon)

In Strict Mode, connections are only allowed between **type-compatible columns**. The system validates that the source and target columns have compatible PostgreSQL data types.

#### Type Compatibility Groups

| Category | Compatible Types |
|----------|------------------|
| **UUID** | `uuid` |
| **Integer** | `integer`, `int`, `int2`, `int4`, `int8`, `smallint`, `bigint`, `serial`, `smallserial`, `bigserial` |
| **Numeric** | `numeric`, `decimal` |
| **Float** | `real`, `float4`, `double precision`, `float8` |
| **String** | `text`, `varchar`, `char`, `character`, `character varying` |
| **Boolean** | `boolean`, `bool` |
| **Date** | `date` |
| **Time** | `time`, `timetz` |
| **Timestamp** | `timestamp`, `timestamptz` |
| **JSON** | `json`, `jsonb` |
| **Binary** | `bytea` |

#### Examples

| Connection | Types | Strict Mode |
|------------|-------|-------------|
| `orders.user_id` → `users.id` | uuid → uuid | ✅ Allowed |
| `orders.user_id` → `products.description` | uuid → text | ❌ Blocked |
| `items.product_id` → `products.id` | integer → bigint | ✅ Allowed |
| `orders.created_at` → `logs.timestamp` | timestamp → timestamptz | ✅ Allowed |

When a connection is blocked in Strict Mode, you'll see a toast notification explaining the type mismatch.

## 📇 About The Project

I look around the internet and found many Database Schema Visualizers that require me to either download the software, or login to view my Database Schema. I feel like there's too many unneccessary steps, just to view the schema.

Thus, I've decided to take this opportunity to build this **Open Source, Free, Login-less and Secured** Supabase Schema Visualizer 🔥

### 🔨 Built With

- [Vue 3](https://v3.vuejs.org/)
- [Vite](https://vitejs.dev/)
- [WindiCSS](https://windicss.org/)

## 🐾 Instructions

1. Go to [Supabase App](https://app.supabase.io/)
2. Select your Project
3. Go to `Settings`
4. In Settings tab, Go to `API`
5. Under `Config`, copy `URL`
6. Under `API Keys`, copy `anon` `public`
7. Paste both value into their respectively slot in [Supabase Schema](https://supabase-schema.vercel.app/)
8. Fetch data
9. Enjoy the Visualization 🎉

Remeber to ⭐ this repo if you ❤ this Apps

## 🌎 Local Development

### Prerequisites

Yarn

- ```sh
  npm install --global yarn
  ```

### Development

1. Clone the repo
   ```sh
   git clone https://github.com/zernonia/supabase-schema.git
   ```
2. Install NPM packages
   ```sh
   yarn install
   ```
3. Run Development instance
   ```sh
   yarn dev
   ```

## ➕ Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgement

1. Fundamental for this Visualization ([Generate database types from OpenAPI specification](https://supabase.io/docs/reference/javascript/generating-types#generate-database-types-from-openapi-specification))
2. Guide to Construct Dynamic SVG Connector ([Connecting Table using SVG](https://codepen.io/alojzije/pen/ndfrI))
3. [Icones - icon gallery](https://icones.js.org/)

## 📈 Analytics

I'm using [Umami Analytics](https://umami.is/docs/about) because I'm interested in the distributions of user who uses Supabase and this tool.

[This](https://umami-zernonia.vercel.app/share/yzSUulXQ/Supabase%20Schema) is the public URL for the analytics. Enjoy!

## 📜 License

Not Associated with Supabase.

Distributed under the MIT License. See `LICENSE` for more information.

# 📧 Contact

Zernonia - [@zernonia](https://twitter.com/zernonia) - zernonia@gmail.com

Also, if you like my work, please buy me a coffee ☕😳

<a href="https://www.buymeacoffee.com/zernonia" target="_blank">
    <img src="https://www.buymeacoffee.com/assets/img/custom_images/yellow_img.png" alt="Logo" >
  </a>
