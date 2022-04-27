const express = require("express");
const { webkit } = require("playwright");

const router = express.Router();

/**
 * 获取网页截图
 * @param url 目标网页地址，需要进行转码，例如 encodeURIComponent('http://www.baidu.com') => 'http%3A%2F%2Fwww.baidu.com'
 * @param fullPage <1|0> 当为 1 时，截取整个可滚动页面的屏幕截图，而不是当前可见的视口。默认为0
 * @param quality 图像的质量，介于 0-100 之间。不适用于png图像
 * @param type <"png"|"jpeg"> 指定截图类型，默认为png
 * @param timeout 最大等待时间，以毫秒为单位，默认为 30 秒
 * @param selector css选择器，设置该值会截取网页中指定部分图片，需要进行转码, 例如 encodeURIComponent('#id')
 * @param base64 <1|0> 当为 1 时，将返回图片的base64编码，而不是图片流。默认为0
 */
router.get("/", async (req, res, next) => {
  const { url, selector, base64, ...options } = req.query;

  if (!url || !/^(https?:\/\/)/.test(url)) {
    next(new Error("请检查url参数是否输入正确"));
  } else {
    const browser = await webkit.launch();
    const page = await browser.newPage();
    let buffer = null;
    try {
      await page.goto(url);
      const opts = getOptions(options);

      if (selector) {
        buffer = await page.locator(selector).screenshot(opts);
      } else {
        buffer = await page.screenshot(opts);
      }

      if (buffer && buffer.length) {
        if (base64 === "1") {
          res.send(buffer.toString("base64"));
        } else {
          res.setHeader(
            "Content-Type",
            opts.type === "jpeg" ? "image/jpeg" : "image/png"
          );
          res.setHeader("Content-Length", buffer.length);
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.send(buffer);
        }
      } else {
        next(new Error("图片截取失败"));
      }
    } catch (e) {
      next(e);
    } finally {
      // 关闭流
      await browser.close();
    }
  }
});

/**
 * 解析参数
 * @param {*} options
 */
function getOptions(options) {
  const { fullPage, quality, type, timeout } = options;
  const opts = {};
  if (fullPage === "1") {
    opts.fullPage = true;
  }
  if (typeof quality !== "undefined") {
    opts.quality = +quality;
  }
  if (typeof type !== "undefined") {
    opts.type = type;
  }
  if (typeof timeout !== "undefined") {
    opts.timeout = +timeout;
  }
  return opts;
}

module.exports = router;
