import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import inquirer from "inquirer";
import chalk from "chalk";
import figures from "figures";

// Định nghĩa __dirname cho môi trường ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

async function run() {
  console.clear();
  console.log(
    chalk.cyan.bold(
      `\n${figures.star} NEXTJS ROUTE GENERATOR (ESM) ${figures.star}\n`,
    ),
  );

  const appDir = path.join(rootDir, "app");

  // Hàm đệ quy quét tất cả folder trong app để làm list chọn
  const getAllDirs = (dirPath, arrayOfDirs = []) => {
    if (!fs.existsSync(dirPath)) return [];

    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    files.forEach((file) => {
      // Loại bỏ các folder group route (), folder ẩn _, và api
      if (
        file.isDirectory() &&
        file.name !== "api" &&
        file.name !== "node_modules" &&
        file.name !== ".next" 
      ) {
        const relativePath = path.relative(
          appDir,
          path.join(dirPath, file.name),
        );
        arrayOfDirs.push(relativePath);
        getAllDirs(path.join(dirPath, file.name), arrayOfDirs);
      }
    });
    return arrayOfDirs;
  };

  const existingDirs = getAllDirs(appDir);
  const choices = [
    {
      name: chalk.yellow(`${figures.pointer} [Tạo ngay tại gốc /app]`),
      value: "",
    },
    ...existingDirs.map((d) => ({
      name: `${figures.arrowRight} ${d}`,
      value: d,
    })),
  ];

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "parent",
      message: "Bạn muốn tạo route trong folder nào?",
      choices: choices,
      pageSize: 10,
    },
    {
      type: "input",
      name: "name",
      message: "Nhập tên folder route mới:",
      validate: (input) => {
        if (!input) return "Vui lòng nhập tên!";
        if (input.includes("/") || input.includes("\\"))
          return "Chỉ nhập tên, không nhập đường dẫn!";
        return true;
      },
    },
  ]);

  const targetPath = path.join(appDir, answers.parent, answers.name);
  const displayPath = path.join("app", answers.parent, answers.name);
  const componentName =
    answers.name.charAt(0).toUpperCase() + answers.name.slice(1);

  // Template code - Bạn có thể sửa nội dung ở đây
  const templates = {
    "page.tsx": `export default function ${componentName}Page() {\n  return (\n    <main>\n      <h1>${answers.name} Page</h1>\n    </main>\n  );\n}`,
    "layout.tsx": `export default function ${componentName}Layout({ children }: { children: React.ReactNode }) {\n  return <section className="layout-${answers.name}">\$\{children\}</section>;\n}`,
    "loading.tsx": `export default function Loading() {\n  return <p>Loading ${answers.name}...</p>;\n}`,
    "error.tsx": `'use client';\n\nimport { useEffect } from 'react';\n\nexport default function Error({ error, reset }: { error: Error; reset: () => void }) {\n  useEffect(() => {\n    console.error(error);\n  }, [error]);\n\n  return (\n    <div>\n      <h2>Đã có lỗi xảy ra!</h2>\n      <button onClick={() => reset()}>Thử lại</button>\n    </div>\n  );\n}`,
  };

  if (!fs.existsSync(targetPath)) {
    console.log(
      chalk.blue(`\n${figures.play} Đang khởi tạo tại ${displayPath}...`),
    );

    fs.mkdirSync(targetPath, { recursive: true });

    Object.entries(templates).forEach(([file, content]) => {
      fs.writeFileSync(path.join(targetPath, file), content);
      console.log(chalk.green(`   ${figures.tick} Created: ${file}`));
    });

    console.log(chalk.green.bold(`\n${figures.checkboxOn} HOÀN TẤT!`));
    console.log(chalk.gray(`-------------------------------------------\n`));
  } else {
    console.log(
      chalk.red(
        `\n${figures.cross} Lỗi: Thư mục [${answers.name}] đã tồn tại rồi!\n`,
      ),
    );
  }
}

run().catch((err) => {
  console.error(chalk.red("\n❌ Đã xảy ra lỗi hệ thống:"), err);
  process.exit(1);
});
