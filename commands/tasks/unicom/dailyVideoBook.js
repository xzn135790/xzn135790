const crypto = require('crypto');
const { RSAUtils } = require('./RSAUtils');
const moment = require('moment');
const { appInfo, buildUnicomUserAgent } = require('../../../utils/device')
const { default: PQueue } = require('p-queue');

//阅读打卡看视频得积分
var transParams = (data) => {
  let params = new URLSearchParams();
  for (let item in data) {
    params.append(item, data['' + item + '']);
  }
  return params;
};


function w() {
  var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}
    , t = [];
  return Object.keys(e).forEach((function (a) {
    t.push("".concat(a, "=").concat(encodeURIComponent(e[a])))
  }
  )),
    t.join("&")
}

var dailyVideoBook = {
  getBookUpDownChapter: async (axios, options) => {
    const { jar, book, chapter } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data, config } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://st.woread.com.cn/`,
        "origin": "http://st.woread.com.cn"
      },
      url: `http://st.woread.com.cn/touchextenernal/read/getUpDownChapter.action`,
      method: 'POST',
      jar,
      data: transParams({
        'cntindex': book.cntindex,
        'chapterseno': chapter.chapterseno || 1
      })
    })
    return data.message
  },
  getBookList: async (axios, options) => {
    const { jar, params } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data, config } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://st.woread.com.cn/`,
        "origin": "http://st.woread.com.cn"
      },
      url: `http://st.woread.com.cn/touchextenernal/read/getBookList.action`,
      method: 'POST',
      jar,
      data: transParams({
        'bindType': '1',
        'categoryindex': '118440',
        'curpage': '1',
        'limit': '10',
        'pageIndex': '10843',
        'cardid': params.cardid
      })
    })
    return data.message
  },
  doTask: async (axios, options) => {
    await require('./rewardVideo').doTask(axios, {
      ...options,
      acid: 'AC20200521222721',
      taskId: '2f2a13e527594a31aebfde5af673524f',
      codeId: 945535616,
      reward_name: '阅读打卡看视频得积分'
    })
  },
  oauthMethod: async (axios, options) => {
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `https://img.client.10010.com/`,
        "origin": "https://img.client.10010.com"
      },
      url: `https://m.client.10010.com/finderInterface/woReadOauth/?typeCode=oauthMethod`,
      method: 'GET'
    })
    return data.data.key
  },
  login: async (axios, options) => {
    const useragent = buildUnicomUserAgent(options, 'p')
    //密码加密
    var modulus = "00D9C7EE8B8C599CD75FC2629DBFC18625B677E6BA66E81102CF2D644A5C3550775163095A3AA7ED9091F0152A0B764EF8C301B63097495C7E4EA7CF2795029F61229828221B510AAE9A594CA002BA4F44CA7D1196697AEB833FD95F2FA6A5B9C2C0C44220E1761B4AB1A1520612754E94C55DC097D02C2157A8E8F159232ABC87";
    var exponent = "010001";
    var key = RSAUtils.getKeyPair(exponent, '', modulus);
    let phonenum = RSAUtils.encryptedString(key, options.user);


    let { config: m_config } = await axios.request({
      headers: {
        "user-agent": useragent,
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `https://m.iread.wo.cn/touchextenernal/common/shouTingLogin.action`,
      method: 'POST',
      data: transParams({
        phonenum
      })
    })
    let m_jar = m_config.jar
    let cookiesJson = m_jar.toJSON()
    let diwert = cookiesJson.cookies.find(i => i.key == 'diwert')
    let useraccount = cookiesJson.cookies.find(i => i.key == 'useraccount')
    if (!useraccount || !diwert) {
      throw new Error('获取用户信息失败')
    }

    let { config: st_config } = await axios.request({
      headers: {
        "user-agent": useragent,
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `http://st.woread.com.cn/touchextenernal/common/shouTingLogin.action`,
      method: 'POST',
      data: transParams({
        phonenum
      })
    })
    let st_jar = st_config.jar
    cookiesJson = st_jar.toJSON()
    diwert = cookiesJson.cookies.find(i => i.key == 'diwert')
    useraccount = cookiesJson.cookies.find(i => i.key == 'useraccount')
    if (!useraccount || !diwert) {
      throw new Error('获取用户信息失败')
    }

    return {
      st_jar,
      m_jar
    }
  },
  updatePersonReadtime: async (axios, options) => {
    const { detail, m_jar, st_jar } = options
    await dailyVideoBook.ajaxUpdatePersonReadtime(axios, {
      ...options,
      detail,
      jar: m_jar,
      time: 0
    })
    await dailyVideoBook.addDrawTimes(axios, {
      ...options,
      detail,
      jar: st_jar
    })
    await new Promise((resolve, reject) => setTimeout(resolve, 500))
    await dailyVideoBook.updateReadTimes(axios, {
      ...options,
      detail,
      jar: m_jar
    })
    await new Promise((resolve, reject) => setTimeout(resolve, 10 * 1000))
    await dailyVideoBook.ajaxUpdatePersonReadtime(axios, {
      ...options,
      detail,
      jar: m_jar,
      time: 2
    })
    await new Promise((resolve, reject) => setTimeout(resolve, 500))
    await dailyVideoBook.addReadRatioToRedis(axios, {
      ...options,
      detail,
      jar: m_jar
    })

    await new Promise((resolve, reject) => setTimeout(resolve, 500))
    console.info('完成阅读时间上报')
  },
  ajaxUpdatePersonReadtime: async (axios, options) => {
    const { detail, jar, time } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let res = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://m.iread.wo.cn/`,
        "origin": "http://m.iread.wo.cn"
      },
      url: `http://m.iread.wo.cn/touchextenernal/contentread/ajaxUpdatePersonReadtime.action`,
      method: 'POST',
      jar,
      data: transParams({
        'cntindex': detail.cntindex,
        'cntname': detail.cntname,
        'time': time || 0
      })
    })
    console.log('ajaxUpdatePersonReadtime 完成')
  },
  updateReadTimes: async (axios, options) => {
    let { jar, detail } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://m.iread.wo.cn/`,
        "origin": "http://m.iread.wo.cn"
      },
      url: `http://m.iread.wo.cn/touchextenernal/contentread/updateReadTimes.action`,
      method: 'POST',
      jar,
      data: transParams({
        'cntid': detail.cntid,
        'cnttype': detail.cnttype
      })
    })
    console.info('updateReadTimes 完成')
  },
  addDrawTimes: async (axios, options) => {
    let { jar } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://st.woread.com.cn/`,
        "origin": "http://st.woread.com.cn",
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `http://st.woread.com.cn/touchextenernal/readluchdraw/addDrawTimes.action`,
      method: 'POST',
      jar
    })

    console.info('addDrawTimes', data.message)
  },
  addReadRatioToRedis: async (axios, options) => {
    let { jar, detail } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `https://m.iread.wo.cn/`,
        "origin": "http://m.iread.wo.cn",
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `http://m.iread.wo.cn/touchextenernal/contentread/addReadRatioToRedis.action`,
      method: 'POST',
      jar,
      data: transParams({
        'chapterallindex': detail.chapterallindex,
        'cntindex': detail.cntindex,
        'curChaptNo': detail.chapterseno,
        'curChaptRatio': '0.0539946886857252',
        'curChaptWidth': '313.052',
        'volumeallindex': detail.chapterallindex
      })
    })
    console.log('addReadRatioToRedis', data.message)
  },
  reportLatestRead: async (axios, options) => {
    let { jar, detail } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://st.woread.com.cn/`,
        "origin": "http://st.woread.com.cn",
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `http://st.woread.com.cn/touchextenernal/contentread/reportLatestRead.action`,
      method: 'POST',
      jar,
      data: transParams({
        'chapterallindex': detail.chapterallindex,
        'cntindex': detail.cntindex
      })
    })
    console.log('reportLatestRead', data.message)
  },
  sltPreReadChapter: async (axios, options) => {
    let { jar, detail } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://st.woread.com.cn/`,
        "origin": "http://st.woread.com.cn",
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `http://st.woread.com.cn/touchextenernal/contentread/sltPreReadChapter.action`,
      method: 'get',
      jar,
      params: transParams({
        'cntindex': detail.cntindex,
        'chapterseno': detail.chapterseno,
        'finishflag': '2',
        'beginchapter': '',
        'prenum': 1,
        'nextnum': 2,
        '_': new Date().getTime()
      })
    })
    console.log('sltPreReadChapter', data.curChapterTitle)
  },
  getActivityStatus: async (axios, options) => {
    let { jar, detail } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://st.woread.com.cn/`,
        "origin": "http://st.woread.com.cn",
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `http://st.woread.com.cn/touchextenernal/thanksgiving/getActivityStatus.action`,
      method: 'POST',
      jar
    })
    console.info('getActivityStatus', data.message)
  },
  ajaxchapter: async (axios, options) => {
    let { jar, detail } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://st.woread.com.cn/`,
        "origin": "http://st.woread.com.cn",
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `http://st.woread.com.cn/touchextenernal/contentread/ajaxchapter.action`,
      method: 'POST',
      jar,
      data: transParams({
        'cntindex': detail.cntindex,
        'catid': '0',
        'volumeallindex': detail.volumeallindex,
        'chapterallindex': detail.chapterallindex,
        'chapterseno': detail.chapterseno,
        'activityID': '',
        'pageIndex': '10782',
        'cardid': detail.cardid,
        '_': new Date().getTime()
      })
    })
    console.log('ajaxchapter innercode', data.innercode)
  },
  // 看视频领2积分
  dovideoIntegralTask: async (axios, options) => {
    await require('./rewardVideo').doTask(axios, {
      ...options,
      acid: 'AC20200521222721',
      taskId: '8e374761c0af4d9d9748ae9be7e5a3f8',
      codeId: 945559732,
      reward_name: '阅读看视频领积分'
    })
  },
  getDays: async (axios, options) => {
    const { m_jar } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://m.iread.wo.cn/`,
        "origin": "http://m.iread.wo.cn",
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `https://m.iread.wo.cn/touchextenernal/readluchdraw/goldegg.action`,
      method: 'get',
      jar: m_jar
    })
    let matched = data.match(/您已连续打卡(.*?)天/)
    console.info('您已连续打卡', matched[1], '天')
    return matched[1]
  },
  // 阅读打卡抽奖-连续三天打卡后可抽奖
  readluchdraw: async (axios, options) => {
    const { m_jar } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let days = await dailyVideoBook.getDays(axios, {
      ...options,
      m_jar
    })
    if (days < 3) {
      console.info('连续打卡尚未达到3天, 跳过抽奖')
      return
    }
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `http://m.iread.wo.cn/`,
        "origin": "http://m.iread.wo.cn",
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `http://m.iread.wo.cn/touchextenernal/readluchdraw/doDraw.action`,
      method: 'POST',
      jar: m_jar,
      data: 'acticeindex=NzFGQzM2Mjc4RDVGNUM4RTIyMzk4MkQ3OUNEMkZFOUE%3D'
    })
    if (data.code === '0000') {
      console.reward(data.prizedesc)
      console.info('readdoDraw 成功', data.prizedesc)
    } else {
      console.error('readdoDraw 失败', data.message)
    }
  },
  read10doDrawPrize: async (axios, options) => {
    const { st_jar } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    console.info('等待5秒')
    await new Promise((resolve, reject) => setTimeout(resolve, 5000))
    let n = 1
    do {
      console.info(`第%s次抽奖`, n)
      let { data } = await axios.request({
        headers: {
          "user-agent": useragent,
          "referer": `http://st.woread.com.cn/`,
          "origin": "http://st.woread.com.cn",
          "X-Requested-With": "XMLHttpRequest"
        },
        url: `http://st.woread.com.cn/touchextenernal/thanksgiving/doDraw.action`,
        method: 'POST',
        jar: st_jar,
        data: 'acticeindex=MDMzMURDNTNDQzA0RDk5QTQ2RTI1RkQ5OEYwQzQ2RkI%3D'
      })
      if (data.code === '0000') {
        console.reward(data.prizedesc)
        console.info('read10doDraw 成功', data.prizedesc)
      } else {
        console.error('read10doDraw 失败', data.message)
        if (data.innercode === '9148' || data.message.indexOf('活动已失效') !== -1) {
          break
        }
      }
      ++n
      console.info('等待3秒')
      await new Promise((resolve, reject) => setTimeout(resolve, 3000))
    } while (n <= 5)
  },
  read10doDraw: async (axios, options) => {
    let Authorization = await dailyVideoBook.oauthMethod(axios, options)
    let { m_jar, st_jar } = await dailyVideoBook.login(axios, {
      ...options,
      Authorization
    })

    if (moment().isBefore(moment('2021-02-07'))) {
      await dailyVideoBook.readSignUp(axios, {
        ...options,
        jar: st_jar
      })
    }

    await dailyVideoBook.read10(axios, {
      ...options,
      m_jar,
      st_jar,
      m1: 2,
      n1: 11
    })

    await dailyVideoBook.readluchdraw(axios, {
      ...options,
      m_jar
    })

    // 活动下线 阅读5*10章 五次机会抽奖
    // await dailyVideoBook.read10doDrawPrize(axios, {
    //   ...options,
    //   st_jar
    // })
  },
  // 阅读拉力赛报名
  readSignUp: async (axios, options) => {
    let { jar } = options
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `https://st.woread.com.cn/touchextenernal/readrally/index.action?channelid=18000698&yw_code=&desmobile=${options.user}&version=${appInfo.unicom_version}`,
        "origin": "http://st.woread.com.cn",
        "X-Requested-With": "XMLHttpRequest"
      },
      url: `https://st.woread.com.cn/touchextenernal/readrally/signUp.action`,
      method: 'POST',
      jar
    })
    console.info('getSignUpStatus', data.message)
  },
  read10: async (axios, options) => {
    const { st_jar, m_jar, m1, n1 } = options

    let cardid = '11910'
    console.info('取得书籍列表')
    let books = await dailyVideoBook.getBookList(axios, {
      ...options,
      jar: st_jar,
      params: {
        cardid
      }
    })

    console.info('准备任务数据中')
    let tasks = []
    let m = m1 || Math.min(books.length, 5)
    do {
      let book = books[m - 1]
      console.info('当前书籍', book.cntname)

      let n = n1 || (10 + Math.floor(Math.random() * 3))
      let chapterseno = 1
      do {
        let chapters = await dailyVideoBook.getBookUpDownChapter(axios, {
          ...options,
          jar: st_jar,
          book,
          chapter: {
            chapterseno
          }
        })

        chapter = chapters[chapters.length - 2]
        chapterseno = chapters[chapters.length - 1].chapterseno

        let detail = {
          'cntindex': book.cntindex,
          'catid': '118440',
          'pageIndex': '10843',
          'cardid': cardid,
          'desmobile': options.user,
          'version': appInfo.unicom_version,
          'cntname': book.cntname,
          'channelid': '18000018',
          'chapterallindex': chapter.chapterallindex,
          'volumeallindex': chapter.volumeallindex,
          'chapterseno': chapter.chapterseno,
          'cntid': chapter.cntid,
          'cnttype': book.cnttype
        }
        tasks.push({
          detail,
          title: chapter.chaptertitle
        })

      } while (--n > 0)

    } while (--m > 0)

    let concurrency = 5
    console.info('开始执行阅读任务，阅读章节并发数', concurrency)
    let queue = new PQueue({ concurrency: concurrency });
    for (let task of tasks) {
      queue.add(async () => {
        console.info('阅读', task.title)
        await dailyVideoBook.reportLatestRead(axios, {
          ...options,
          detail: task.detail,
          jar: st_jar
        })

        await dailyVideoBook.updatePersonReadtime(axios, {
          ...options,
          detail: task.detail,
          st_jar: st_jar,
          m_jar: m_jar
        })

        await dailyVideoBook.sltPreReadChapter(axios, {
          ...options,
          detail: task.detail,
          jar: st_jar
        })

        await dailyVideoBook.ajaxchapter(axios, {
          ...options,
          detail: task.detail,
          jar: st_jar
        })

        console.info('等待4秒')
        await new Promise((resolve, reject) => setTimeout(resolve, 1000))
      })
    }
    await queue.onIdle()

    console.info('阅读5本书完成')
  },
  giftBoints: async (axios, options) => {
    const useragent = buildUnicomUserAgent(options, 'p')
    let res = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `https://img.client.10010.com/`,
        "origin": "https://img.client.10010.com"
      },
      url: `https://act.10010.com/SigninApp/floorData/getIntegralFree`,
      method: 'POST',
      data: transParams({
        'type': 'readNovel'
      })
    })

    let result = res.data

    let taskList = []

    if (result.status !== '0000') {
      console.error('出现错误', result.msg)
      return
    } else {
      taskList = result.data.taskList
    }

    let ts = taskList.find(t => t.templateCode === 'mll_dxs')
    if (ts) {
      if (ts.action === 'API_YILINGQU') {
        console.error('出现错误', '已经领取过')
        return
      }
    } else {
      console.error('出现错误', '不存在的活动')
      return
    }

    let { data, config } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `https://img.client.10010.com/`,
        "origin": "https://img.client.10010.com"
      },
      url: `https://act.10010.com/SigninApp/integral/giftBoints`,
      method: 'POST',
      data: transParams({
        'type': 'readNovel'
      })
    })
    if (data.status === '0000') {
      console.info('领取阅读积分状态', data.data.state === '0' ? data.data.equityValue : data.data.statusDesc)
      if (data.data.state === '0') {
        console.info('提交积分翻倍')
        await dailyVideoBook.lookVideoDouble(axios, {
          ...options,
          jar: config.jar
        })
      }
    } else {
      console.info('领取阅读积分出错', data.msg)
    }
  },
  lookVideoDouble: async (axios, options) => {
    const { jar } = options
    let params = {
      'arguments1': '', // acid
      'arguments2': 'GGPD', // yhChannel
      'arguments3': '', // yhTaskId menuId
      'arguments4': new Date().getTime(), // time
      'arguments6': '',
      'arguments7': '',
      'arguments8': '',
      'arguments9': '',
      'orderId': crypto.createHash('md5').update(new Date().getTime() + '').digest('hex'),
      'netWay': 'Wifi',
      'remark': '签到积分翻倍',
      'remark1': '签到任务读小说赚积分',
      'version': appInfo.unicom_version,
      'codeId': 945535625
    }
    await require('./taskcallback').reward(axios, {
      ...options,
      params,
      jar
    })

    await dailyVideoBook.lookVideoDoubleResult(axios, options)
  },
  lookVideoDoubleResult: async (axios, options) => {
    const useragent = buildUnicomUserAgent(options, 'p')
    let { data } = await axios.request({
      headers: {
        "user-agent": useragent,
        "referer": `https://img.client.10010.com/`,
        "origin": "https://img.client.10010.com"
      },
      url: `https://act.10010.com/SigninApp/integral/giftBoints`,
      method: 'POST',
      data: transParams({
        'type': 'readNovelDouble'
      })
    })
    console.info('翻倍结果', data.msg)
  }
}

module.exports = dailyVideoBook