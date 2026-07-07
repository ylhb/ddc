const fs = require('fs');
const path = require('path');
const axios = require('axios');

const HOST = 'https://hshapp.ncn.com.cn';
const BASE_URL = '/wisdom3/charge';

const queryChargeDeviceInfoByDeviceIdUrl = `${HOST}${BASE_URL}/queryChargeDeviceInfoByDeviceId.do`;

const FAKE_USERID = '1';

// 4台设备，每台10个端口的配置示例（请替换为您真实的URL）
const DEVICES = [
  {
    id: '013000150',
  },
  {
    id: '013000159',
  },
  {
    id: '013000154',
  },
  {
    id: '013000158',
  },
];
// const PORTS =;

// 延时函数
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 带重试机制的 HTTP GET 请求
 */
async function fetchPortData(deviceId) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // 设置 10 秒超时
      const response = await axios.get(queryChargeDeviceInfoByDeviceIdUrl, {
        timeout: 10000,
        params: {
          deviceId,
          userId: FAKE_USERID,
        },
      });
      // console.log('response', deviceId, response)
      if (response.status === 200) {
        return response?.data?.infoMap?.deviceInfo?.chargeDevicePortInfoList;
      }
    } catch (error) {
      console.error(
        `请求失败 ${url}, 尝试第 ${attempt} 次重试... 错误: ${error.message}`,
      );
      if (attempt < 3) await sleep(2000); // 失败后等待 2 秒再重试
    }
  }
  return { error: 'Failed to fetch data after 3 attempts' };
}

async function main() {
  const timestamp = new Date().toISOString();
  const allData = { timestamp, results: [] };

  // 循环遍历设备和端口
  for (const dev of DEVICES) {
    console.log(`正在采集: ${dev.id}`);
    const jsonRes = await fetchPortData(dev.id);

    allData.results.push({
      deviceId: dev.id,
      data: jsonRes,
    });
  }

  // 确保 data 文件夹存在
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 按日期保存为单独的 JSON 文件，如 data/2026-07-07.json
  const dateStr = new Date().toISOString().split('T')[0];
  const filePath = path.join(dataDir, `${dateStr}.json`);

  // 读取已有数据并追加
  let existingData = [];
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (e) {
      existingData = [];
    }
  }

  existingData.push(allData);

  // 写入文件
  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf-8');
  console.log(`数据成功保存至 ${filePath}`);
}

main().catch((err) => {
  console.error('脚本运行崩溃:', err);
  process.exit(1);
});
