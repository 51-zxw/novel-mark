// 临时脚本：生成管理员密码的 bcrypt 哈希，用完可删
const bcrypt = require("bcryptjs");
const password = process.env.ADMIN_PASSWORD || "change-me-please";
const hash = bcrypt.hashSync(password, 10);
console.log("PASSWORD_HASH=" + hash);
console.log("INSERT SQL:");
console.log(
  `insert into admin_users (username, password_hash) values ('admin', '${hash}') on conflict (username) do update set password_hash = excluded.password_hash;`
);