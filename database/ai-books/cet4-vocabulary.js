/**
 * 大学英语四级词汇（自编）
 * ===================================================================
 * 词汇书的索引规则和其它书不同：**英文单词本身作索引**。
 *搜 abandon 就能找到所有和 abandon 相关的知识点（释义 + 词组 + 辨析）。
 *
 * 每条结构：
 *   word     单词（同时是索引）
 *   phonetic  音标
 *   pos      词性
 *   meaning  释义
 *   aids     前 6 类零额度记忆辅助 + 6 类AI 辅助的预置内容
 *
 * 记忆辅助针对「单词」的特点设计：
 *   chain  —— 用词根词缀串起同源词（这是背单词最高效的方式）
 *   contrast —— 与形近词/易混词对比
 *   analogy —— 用场景/画面联想词义
 */

module.exports = [
  {
    id: 'cet4-01',
    title: '大学英语四级核心词汇',
    subject: '英语',
    stage: 'college',
    stageName: '大学',
    edition: '自编 · 高频核心',
    official: false,
    wordCount: 63,
    intro:
      '面向中国大学生的四级核心词汇离线包，共 8 组 63 词，按词性与功能分组：高频动词、易混形容词、' +
      '高频名词、副词与比较级、动词短语固定搭配、易混词辨析专项、学术高频词、主题话题词。' +
      '索引即英文单词，支持拼写前缀模糊搜索。每词含词根词缀串联、形近辨析、场景联想与真题考法。',
    units: [
      {
        title: '第1 组 · 高频动词（出现率最高，必须眼熟）',
        points: [
          {
            title: 'abandon',
            index: 'abandon',
            content:
              'abandon vt. 放弃，抛弃；遗弃。词根 a-(去) + bandon(控制)，字面意思是「脱离控制」。' +
              '常考搭配 abandon oneself to沉溺于；abandon a plan 放弃计划。' +
              '近义词 give up 侧重「自愿放弃」，abandon 更强调「被迫或彻底丢弃」。',
            keywords: ['abandon', '放弃', 'a-(去)', 'bandon', '遗弃', '沉溺于'],
            aids: {
              core: 'abandon = 放弃/遗弃，a-(去) + bandon(控制)，字面「脱离控制」。',
              chain: 'a-(离开) → bandon(控制) → 脱离控制 → 放弃、遗弃',
              structure: '①词性 vt. ②释义三档 ③词根拆解 ④常考搭配 ⑤近义词辨析',
              contrast:
                'abandon vs give up：abandon 强调「彻底丢弃、不可挽回」（abandon a child弃养）；' +
                'give up 强调「停止努力」（give up smoking 戒烟），可反复。',
              qa: '问：为什么 abandon 自带「被遗弃」的负面感？答：字根是「脱离控制」，孩子脱离控制就是被抛弃。',
              scene: '想象你放手让一个纸飞机飞走——松手的那一刻就是 abandon。',
              mnemonic: '「a-band-手」：abandon 就是放开手不管了。',
              analogy:
                '像「把风筝线剪断」：不是暂时不拉，是直接剪断，线飘走了再也回不来。' +
                '失效点：abandon 一个计划后若重启计划，那叫 resume 不叫 return。',
              story:
                '他abandon 了两件事：一个是那段感情，一个是那座城市。' +
                '感情走了控制，城市留下了空房间——他把钥匙也 abandon 了。' +
                '逻辑是：能放弃控制，就不必害怕失去。',
              image:
                '一只猫伸出爪子，松开了抓着的毛线球。毛线球滚向远处，猫没有去追，' +
                '爪子上还留着线头的印子，说明它曾经抓得很紧。',
              exam: '常考 abandon oneself to的用法；写作里用 abandon 替换 give up 更显正式。'
            }
          },
          {
            title: 'benefit',
            index: 'benefit',
            content:
              'benefit n. 利益，好处；v. 有益于。词根 bene-(好) + fit(做)，字面「做好事」。' +
              '搭配 benefit from 受益于；be beneficial to 对…有益。' +
              '注意区分 benefit(名词利益) / beneficial(形容词有益的) / benefactor(恩人)。',
            keywords: ['benefit', '利益', 'bene-', 'fit', '有益于', 'beneficial', '恩人'],
            aids: {
              core: 'benefit = 好处/有益，bene-(好) + fit(做)，「做好事」。',
              chain: 'bene-(好) → fit(做) → 做好事 → benefit 利益 → beneficial 有益的',
              structure: '①词性 n./v. ②释义 ③词根 ④搭配 from ⑤词族三兄弟',
              contrast:
                'benefit(名词) vs beneficial(形容词)：beneficial to health 对健康有益，' +
                '不能直接说 benefit to health。',
              qa: '问：benefit from 和 benefit to 哪个对？答：介词只能用 from，be beneficial to才用 to。',
              scene: '想象每天早上多睡 20 分钟，一个月后精神明显变好——这就是 benefit。',
              mnemonic: 'bene 好的 + fit 做 → 做好事有好处。',
              analogy:
                '像「给植物浇水」：benefit 是浇下去的水，beneficial 是浇水这个动作的意义。' +
                '失效点：benefit 强调得到好处，profit 强调赚取的利润，不完全同义。',
              exam: '必考 benefit from（非 benefit by）；beneficial 拼写少一个 i，别写错。'
            }
          },
          {
            title: 'consequence',
            index: 'consequence',
            content:
              'consequence n. 结果，后果。词根 con-(共同) + sequ(跟随) + -ence。' +
              '重音在第一个音节 CON-sequence。搭配 in consequence 因此；' +
              'a sequence of events 一连串事件（注意 sequence 单独用是「顺序」）。' +
              '近义词 result 较中性，consequence 常指「不良后果」。',
            keywords: ['consequence', '结果', '后果', 'con-', 'sequ', '因此', 'sequence'],
            aids: {
              core: 'consequence = 后果，重音在第一音节 CON，con-(共同)+sequ(跟随)。',
              chain: 'sequ(跟随) → sequence 顺序 → con-(共同) → consequence 随之而来的结果',
              structure: '①释义 ②重音位置 ③词根 ④搭配两处 ⑤与 result 辨析',
              contrast:
                'consequence（多指负面后果）vs result（中性结果）：' +
                'a consequence of carelessness 是「粗心的后果」，result 更中性。',
              qa: '问：为什么 consequence 多指坏结果？答：日常搭配 in consequence of 引出的通常是不利后果。',
              scene: '想象你连续三天熬夜，第三天早上顶不动了——这就是 the consequence。',
              mnemonic: 'CON-sequence：con 一起、sequ 跟上，一起来的结果。',
              analogy:
                '像「多米诺骨牌」：第一张倒下是 action，后面全倒才是 consequence。' +
                '失效点：consequence 强调「已经发生的结果」，potential consequence 是「潜在后果」，还没发生。',
              exam: '发音是高频失分点，重音别放最后；in consequence = therefore，是写作替换词。'
            }
          },
          {
            title: 'demonstrate',
            index: 'demonstrate',
            content:
              'demonstrate vt. 证明，论证；vi. 演示；adj. demonstrable 可证明的。' +
              '词根 de-(向下) + monstr(显示)。' +
              '搭配 demonstrate against 对…示威；demonstrate a theorem 证明定理。' +
              '注意它和 illustrate（用图表示）不同：demonstrate 强调「证明是真的」，' +
              'illustrate 强调「加以说明」。',
            keywords: ['demonstrate', '证明', '论证', 'de-', 'monstr', '示威', 'illustrate'],
            aids: {
              core: 'demonstrate = 证明/演示，de- + monstr(显示)，「把真相显示出来」。',
              chain: 'monstr(显示) → demonstrate 证明 → demonstration 示威/演示 → demonstrator 演示者',
              structure: '①vt/vi 两用 ②释义三档 ③词根 ④搭配 ⑤与 illustrate 辨析',
              contrast:
                'demonstrate（用证据证明）vs illustrate（用图表说明）：' +
                '研究结论用 demonstrate，教科书插图用 illustrate。',
              qa: '问：a theorem 可以 demonstrate 吗？答：可以，demonstrate a theorem 是固定搭配。',
              scene: '想象老师在你面前举粉笔一步步演算，最后说「这就证明了」——这就是 demonstrate。',
              mnemonic: 'de 下 + monstr 显示 → 往下把结果显示给你看。',
              analogy:
                '像「当场演示」：不是嘴上说「它能跑」，而是当场跑给你看。' +
                '失效点：学术写作里 demonstrate 需要有数据支撑，光举例不算。',
              exam: '阅读理解里出现 demonstrate，答案通常在它后面的数据句；写作可用它替换 show。'
            }
          },
          {
            title: 'efficient',
            index: 'efficient',
            content:
              'efficient adj. 效率高的，有能力的。词根 ef-(出) + fic(做) + -ient，「做得多且不浪费」。' +
              '搭配 efficient method 高效的方法；energy-efficient 节能的。' +
              '形近词：efficiency(n. 效率) / efficient(adj.) / efficacious(adj. 有效的，强调有效果)。' +
              '注意 efficient 强调「不浪费时间」，effective 强调「有效果」，两者常被混用。',
            keywords: ['efficient', '效率', 'ef-', 'fic', 'efficiency', 'effective', '节能'],
            aids: {
              core: 'efficient = 效率高（不浪费），ef-(出) + fic(做)。和 effective（有效果）区分开。',
              chain: 'fic(做) → efficient 效率高 → efficiency 效率 → efficiently 效率高地',
              structure: '①词性 ②释义 ③词根 ④搭配 ⑤三兄弟辨析',
              contrast:
                'efficient（效率）vs effective（效果）：一个省时间，一个有作用。' +
                'a fuel-efficient car 省油的车（效率），an effective drug 有效的药（效果）。',
              qa: '问：效率高的用 efficient 还是 effective？答：看侧重——省时间省力用 efficient。',
              scene: '想象两条上班路：一条 30 分钟堵车，一条 25 分钟畅通——后者是 efficient。',
              mnemonic: 'ef 出 + fic 做 → 做完还能剩下时间 = 有效率。',
              analogy:
                '像「用一只手拧螺丝」：不是拧得更用力，是只用手不返工。' +
                '失效点：efficient 不代表 quality 好——一件东西做得很快但很粗糙，仍是 efficient 但不 effective。',
              exam: '本组最高频错点：写作时把 efficient 当effective 用。记住效率看时间，效果看作用。'
            }
          },
          {
              title: 'assume',
              index: 'assume',
              content:
                'assume vt. 假定，认为；承担（责任）；呈现（某种态度）。词根 a-(向) + sum(拿)，' +
                '字面「向内拿过来据为己有」，引申为「不做验证就当作」。' +
                '常考搭配 assume responsibility 承担责任；assume an attitude 采取某种态度；assume that 从句作宾语。' +
                '易混点：assume 强调「主观认定，而且认定错了也不会自动纠正」；' +
                'resemble 只说「外形看起来像」，不含任何认定；suppose 与 assume 近义，但 suppose 更偏不确定的猜测。',
              keywords: ['assume', '假定', '承担', 'a-', 'sum', 'responsibility', 'resemble'],
              aids: {
                core: 'assume = 假定/承担，a-(向) + sum(拿)，「拿过来就当自己的」。',
                chain: 'a-(向) → sum(拿) → 拿过来 → assume 假定 → assumption 假设 → assumed 所谓的',
                structure: '①词性 vt. ②三层释义 ③词根 a-+sum ④搭配三组 ⑤与 resemble/suppose 辨析',
                contrast:
                  'assume（主观认定，可以是错的）vs resemble（外形相似，不含判断）：' +
                  'the young man assumed a polite voice 装出一种礼貌的口气 vs she resembles her mother 长得像妈妈。',
                qa: '问：为什么学术写作里要慎用 assume？答：因为它跳过验证直接下结论，assume 出来的命题还需要后续证据支撑。',
                scene: '想象你在考场上遇到不会的题，顺手 assume 一下「肯定是 A」，结果四道题全错——assume 的代价就是它从不回头检查。',
                mnemonic: '向内拿（a+sum）：\n拿进心里就当真',
                analogy:
                  '像「把别人掉的钱包直接塞进自己口袋」：钱还没验真伪，动作却已经完成——这就是 assume 的结构（心里已经认定，不再核实）。' +
                  '失效点：assume 只是「认定」，不等于「事实」，所以 assume 出来的结论经常和现实相反。',
                exam: 'assume that 从句用陈述语序（I assume that he is right，不写 that is he right）；写作别把 assume 当「假设」随便用。'
              }
            },
            {
              title: 'assess',
              index: 'assess',
              content:
                'assess vt. 评估，估价。词根 ad-(向) + sess(坐)，字面「坐到跟前仔细打量」，' +
                '引申为对某物给出一个价值判断。常考搭配 assess the impact of 评估……的影响；' +
                'assess the risk 评估风险；名词 assessment n. 评估。' +
                '易混点：assess 强调「估量得出一个数值或等级」；evaluate 强调「评价优劣」；' +
                'estimate 只能对数量或价格做大致估计，不能用在抽象的影响上。',
              keywords: ['assess', '评估', 'ad-', 'sess', '估价', 'assessment', 'evaluate'],
              aids: {
                core: 'assess = 评估，ad-(向) + sess(坐)，「坐近了仔细打量」。',
                chain: 'sess(坐) → assess 评估 → assessment 评估报告 → assessor 评估人 → session（开会坐一起）',
                structure: '①词性 vt. ②释义 ③词根 ad-+sess ④搭配三组 ⑤与 evaluate/estimate 辨析',
                contrast:
                  'assess（核定数值、等级）vs estimate（只给个大概数）：' +
                  'assess the damage 核定损失数额 ✔，estimate the damage 只是猜一个大概。',
                qa: '问：assess 和 evaluate 的分界在哪？答：assess 落在「量」，把东西折算成数字或等级；evaluate 落在「判断」，只分好坏不分大小。',
                scene: '想象你把一台二手手机送去估价，师傅对着外观、开机速度、电池损耗一项项打钩，最后报出一个具体数字——这个动作就是 assess。',
                mnemonic: '向内坐（ad+sess）：\n坐下打量评一评',
                analogy:
                  '像「中医把脉」：医生不先下结论，而是先摸脉、看舌苔，把几处信号合起来估一个「气虚程度」——输入分散信号，输出综合判断。' +
                  '失效点：把脉是定性的经验估量，不产生精确数值；assess 在财务、工程里是要给出具体金额或等级的。',
                exam: '名词是 assessment（双 s + ment），别写成 assesment；四级阅读里 assess 后面跟的数据句常是答案出处。'
              }
            },
            {
              title: 'consume',
              index: 'consume',
              content:
                'consume vt. 消耗，消费；吃完喝完。词根 con-(完全) + sum(拿用)，' +
                '字面「把东西全都拿过来用掉」。常考搭配 consume energy/time 消耗能源、时间；' +
                'consume more calories 摄入更多卡路里；名词 consumer n. 消费者。' +
                '易混点：consume 强调「用掉、耗尽」，主语可以是人也可以是机器；' +
                'spend 强调「花（钱、时间）」，主语必须是人，不能说 the machine spends power。',
              keywords: ['consume', '消耗', '消费', 'con-', 'sum', '能源', 'consumer'],
              aids: {
                core: 'consume = 消耗/消费，con-(完全) + sum(拿)，「全部拿用掉」。',
                chain: 'sum(拿) → consume 消耗 → consumer 消费者 → consumption 消耗量 → consumable 可消费的',
                structure: '①词性 vt. ②两层释义 ③词根 con-+sum ④搭配三组 ⑤与 spend 辨析',
                contrast:
                  'consume（主语含机器、能量）vs spend（主语只能是人）：' +
                  'the machine consumes power 机器耗电 ✔，the machine spends money ✘。',
                qa: '问：为什么 spend power 是错的？答：spend 的宾语必须是钱和时间这类由人支配的资源，能量是被耗掉的，不是被花掉的。',
                scene: '想象手机右上角的电量图标：它不是在「花钱」，而是在被一口一口吃掉，剩1% 时就是快 consume 完了。',
                mnemonic: '全用光（con+sum）：\ncon 全部，sum 拿光',
                analogy:
                  '像「电热水壶烧水」：电能进去、热水出来，能量本身换了一种形式存在——consume 描述的正是这种「形式转化」，而不是东西凭空消失。' +
                  '失效点：氧气被消耗后其实变成了二氧化碳，所以 consume 不等于「消失」，别记成「用完就没了」。',
                exam: '过去式和过去分词都是 consumed（单 s），写成 consummed 是典型错误；consumption / consumer 都要双 s。'
              }
            },
            {
              title: 'contribute',
              index: 'contribute',
              content:
                'contribute vi./vt. 贡献，促成；投稿。词根 con-(共同) + tribute(给予)，' +
                '字面「共同给出一份」。常考搭配 contribute to 促成、造成（后接名词或动名词）；' +
                'contribute to research 为研究做贡献；contribution n. 贡献，投稿。' +
                '易混点：contribute to 常用于「促成（坏结果）」的语境，如 contribute to pollution，' +
                '语气中立偏贬；distribute 则是「分发」，一个给出去一个发下去，方向完全不同。',
              keywords: ['contribute', '贡献', '促成', 'con-', 'tribute', 'contribute to', '投稿'],
              aids: {
                core: 'contribute = 贡献/促成，con-(共同) + tribute(给)，「共同给一份」。',
                chain: 'trib(给) → contribute 贡献 → contribution 贡献 → contributor 贡献者 → attribute 归因于',
                structure: '①词性 vi./vt. ②两层释义 ③词根 con-+tribute ④搭配三组 ⑤与 distribute 辨析',
                contrast:
                  'contribute to（促成、造成结果）vs distribute（把东西分发下去）：' +
                  'pollution contributes to crop damage 污染造成作物损害，distribute 只是把东西发下去，不涉及造成后果。',
                qa: '问：contribute to 后面能接动词原形吗？答：不能。contribute to 是介词短语，必须接名词或动名词，写 contribute to destroy 就错了。',
                scene: '想象几个人往一口空井里扔石子，每人贡献一块，井底的水位慢慢升起来——每一块都不显眼，合起来就成了结果。',
                mnemonic: '共同给（con+tribute）：\n你一票我一票，促成',
                analogy:
                  '像「多人往储蓄罐里投硬币」：contribute 是每个人拿出自己的一份，攒起来产生的结果就是 contribute to 后面那个东西。' +
                  '失效点：投币只让罐子变满，不保证结果变好，contribute to 同样是中性的，不等于「努力了就一定达成目标」。',
                exam: 'contribute to + 动名词是本组最高频语法失分点；写作里用名词 contribution 比动词更稳。'
              }
            },
            {
              title: 'eliminate',
              index: 'eliminate',
              content:
                'eliminate vt. 消除，排除；淘汰。词根 e-(出) + limin(界限)，' +
                '字面「推到界限之外」，所以强调彻底。常考搭配 eliminate the need for 消除对……的需要；' +
                'eliminate risks 排除风险；be eliminated from 被淘汰出局。' +
                '易混点：eliminate 强调「彻底去掉，使不再存在」；' +
                'reduce 强调「数量变少，但可能还有剩余」；remove 只是「把东西移开」，不保证它不再出现。',
              keywords: ['eliminate', '消除', '淘汰', 'e-', 'limin', '界限', 'reduce'],
              aids: {
                core: 'eliminate = 彻底消除，e-(出) + limin(界限)，「推到界限以外」。',
                chain: 'limin(界限) → eliminate 消除 → elimination 消除 → prelude（pre- 前 + lud 游戏）前奏',
                structure: '①词性 vt. ②两层释义 ③词根 e-+limin ④搭配三组 ⑤与 reduce/remove 辨析',
                contrast:
                  'eliminate（彻底没有）vs reduce（变少但仍在）：' +
                  'eliminate the risk 是风险归零，reduce the risk 只是把风险压低，后面接 still has some risk 才成立。',
                qa: '问：reduce 和 eliminate 为什么不能互换？答：程度不同。reduce 之后仍可说仍有一些，eliminate 之后不能再说残留。',
                scene: '想象厨房抽油烟机启动的那一秒：不是把油烟变少了，而是把它排到室外，屋里从此没有油烟——这就是 eliminate 的彻底性。',
                mnemonic: 'e 出去 + limin 界限：\n推到界线外，干净',
                analogy:
                  '像「把筛子里的沙子全部筛走」：reduce 相当于只拿走一半，筛底还剩一层细沙；eliminate 要做到筛子空了、晃一晃也不掉渣。' +
                  '失效点：现实里「彻底消除」往往做不到，论文写 eliminate risks 只是作者的措辞强度，不代表真的零风险。',
                exam: 'eliminate（消除掉）与 be eliminated from（被淘汰）用法不同：eliminate the risk / be eliminated from the competition。'
              }
            },
            {
              title: 'expand',
              index: 'expand',
              content:
                'expand vi./vt. 扩大，扩张；详述。词根 ex-(向外) + pand(张开)，' +
                '字面「把折叠着的东西摊开」。常考搭配 expand into 扩展到；expand on/upon 对……详述；' +
                '名词 expansion n. 扩张。易混点：expand 强调「体积或范围由小变大」；' +
                'extend 强调「长度或时间向外伸出」；grow 是自然增长，不需要外力。' +
                '特别注意 expand on 是「就着已说过的那一点再讲细」，对象是话题不是尺寸。',
              keywords: ['expand', '扩大', '扩张', 'ex-', 'pand', '展开', 'expansion'],
              aids: {
                core: 'expand = 扩大/扩张，ex-(向外) + pand(张开)，「把折叠的摊开」。',
                chain: 'pand(张开) → expand 扩张 → expansion 扩张 → expanses 广阔处 → expansive 铺开的',
                structure: '①词性 vi./vt. ②三层释义 ③词根 ex-+pand ④搭配三组 ⑤与 extend/grow 辨析',
                contrast:
                  'expand（范围体积向外摊开）vs extend（向外伸长，常是长度或时间）：' +
                  'the city expanded 城市扩张 ✔，they extended the deadline 延长了期限 ✔。',
                qa: '问：expand on 到底是「扩大」还是「详述」？答：它是「就一个话题再展开细讲」，不是尺寸变大，别和 expand into 混起来。',
                scene: '想象你把折了八折的地图慢慢摊开，纸面越铺越大，最后四个角都上了桌——城市和经济体量的增长就是这种摊开。',
                mnemonic: 'ex 往外 + pand 张：\n摊开来，越摊越大',
                analogy:
                  '像「解开一层层收拢的伞」：收拢时占地方很小，展开后伞面直径变大——expand 的变大是结构层面的展开，不是单纯充气。' +
                  '失效点：expand 一般不用于「长高」「变重」，这些是 grow 或 gain 的活儿，别把 expand 当万能的变大。',
                exam: 'expand on 后面接的是观点或话题，写作里 expand on your idea 比重复观点高级；别写 expand on to do。'
              }
            },
            {
              title: 'maintain',
              index: 'maintain',
              content:
                'maintain vt. 维持，保持；保养（机器）；坚持认为。词根 main(手) + tain(持有)，' +
                '字面「用手拿着不放」，引申为让状态持续下去。' +
                '常考搭配 maintain a healthy weight 保持健康体重；maintain an interest in 保持对……的兴趣；' +
                'maintain that 从句（坚持认为）。易混点：maintain 强调「使状态持续」；' +
                'contain 是「容纳」；obtain 是「获得」，三者只差一个字母，分别按 m 手扶、c 容器、ob 取得来记形。',
              keywords: ['maintain', '维持', '保持', 'main', 'tain', '坚持认为', '保养'],
              aids: {
                core: 'maintain = 维持/保持，main(手) + tain(持)，「用手拿着不放」。',
                chain: 'tain(持) → maintain 维持 → maintainable 可维持的 → obtain（ob- 朝 + 持）获得 → contain（con- 全 + 持）容纳',
                structure: '①词性 vt. ②三层释义 ③词根 main+tain ④搭配三组 ⑤与 contain/obtain 辨析',
                contrast:
                  'maintain（保持状态持续）vs contain（容纳）：a building contains a stairwell 楼里有楼梯（客观装有）；' +
                  'maintain a steady temperature 维持稳定温度（靠动作维持）。一个讲「里面有什么」，一个讲「让状态别变」。',
                qa: '问：maintain 和 contain 只差一个字母怎么记？答：maintain 的 main 是「手」，用手扶着才不会倒；contain 的 con 是「一起装」，那是容器的事。',
                scene: '想象你每天早上称一次体重记在本子上，只要那串数字不往上飘，就算 maintain 住了——维持不是一次性动作，是持续守住一个状态。',
                mnemonic: 'main 手 + tain 持：\n用手扶着不松手',
                analogy:
                  '像「给自行车链条上油」：车能一直骑下去不是因为上了一次油，而是每隔一段时间就补一次——maintain 的核心是周期性把状态续上。' +
                  '失效点：maintain 只保证「维持现状」，不保证「变得更好」，想变好得用 improve 或 upgrade。',
                exam: 'maintain that 从句表「坚持认为」，是阅读高频推理点；它和 retain（保留）不同，retain 后不接 that 从句。'
              }
            },
            {
              title: 'obtain',
              index: 'obtain',
              content:
                'obtain vt. 获得，得到（较正式）。词根 ob-(朝向) + tain(持有)，' +
                '字面「转向并取得」。常考搭配 obtain permission 获得许可；obtain a degree 取得学位；' +
                'obtain consent 获得同意。易混点：obtain 强调「设法拿到」的正式结果，' +
                '宾语常是许可、文件、学位这类凭证；acquire 强调「习得」，宾语常是技能、知识、语言；' +
                'get 最口语化，作文里显得随意。',
              keywords: ['obtain', '获得', 'ob-', 'tain', '许可', '学位', 'acquire'],
              aids: {
                core: 'obtain = 获得（正式），ob-(朝) + tain(持)，「转向并取得」。',
                chain: 'tain(持) → obtain 获得 → obtainable 可获得的 → maintain（main 手 + 持）维持 → 同一词根三个动词',
                structure: '①词性 vt. ②释义 ③词根 ob-+tain ④搭配三组 ⑤与 acquire/get 辨析',
                contrast:
                  'obtain（拿到凭证、许可，看重结果）vs acquire（习得技能知识，看重过程）：' +
                  'obtain a certificate 拿到证书 ✔，acquire a language 习得一门语言 ✔。',
                qa: '问：为什么 obtain 的宾语常带 a 或 the？答：因为它拿到的多是单数的正式文件或资格，习惯说 obtain a permit，不说 obtains 作泛指。',
                scene: '想象你在政务大厅排队，窗口后面递出来一张盖好章的表格——你并没有自己造出它，只是「取得」了它，这就是 obtain。',
                mnemonic: 'ob 朝 + tain 持：\n伸手拿，到手才算',
                analogy:
                  '像「在自动售货机上按取货键」：钱先付、货先掉进取货口，你伸手把它取出来——obtain 强调的是最后这个「拿到的动作」，机器只是提供了条件。' +
                  '失效点：售货机只能给出库存里的东西，obtain 也一样，只能拿到现成存在的凭证；技能和知识得靠 acquire 或 learn。',
                exam: '四级作文里 obtain 比 get 正式，写「获取信息/许可」这类正式语境时优先用 obtain。'
              }
            },
            {
              title: 'emphasize',
              index: 'emphasize',
              content:
                'emphasize vt. 强调，着重。词根 em-(加强) + phas(说) + -ize(使……)，' +
                '字面「加重语气反复说」，来自希腊语 emphasis。常考搭配 emphasize the importance of 强调……的重要性；' +
                'emphasis n. 强调；emphasized adj. 着重表示的。' +
                '易混点：emphasize 是「把重点标出来」，后面多接抽象名词；' +
                'stress 也可以表强调，但更多用在重读某个音节或「压力」上；' +
                'emphasis 还有第二个意思，即单词里读得最重的那个音节（重音）。',
              keywords: ['emphasize', '强调', 'em-', 'phas', '说', 'emphasis', 'importance'],
              aids: {
                core: 'emphasize = 强调，em-(加强) + phas(说)，「加重语气反复说」。',
                chain: 'phas(说) → emphasize 强调 → emphasis 强调 → emphatic 强调的 → emphasis 又指「重音」',
                structure: '①词性 vt. ②释义 ③词根 em-+phas ④搭配两组 ⑤与 stress/重音 辨析',
                contrast:
                  'emphasize（内容上标出重点）vs stress（重读某词，或施加压力）：' +
                  'She emphasized the need for reform 她着重指出改革的必要性 ✔，She stressed the word 「urgent」 ✔。',
                qa: '问：emphasis 有几层意思？答：两层，一是「强调」，二是「重音」；阅读里重音决定句子重心，但不要把它和强调混为一个意思。',
                scene: '想象你在小组汇报前，把 PPT 最后一行加粗成红色，讲的时候还特意停顿一秒——你正在强调它。',
                mnemonic: 'em 加强 + phas 说：\n反复说，加重说',
                analogy:
                  '像「在一段文字里用荧光笔画出那一行」：荧光笔不改写内容，只告诉眼睛「重点在这里」，这正是 emphasize 的功能——它不创造新信息，只分配注意力。' +
                  '失效点：强调得再多也不能替代证据，把同一句话重复三遍，读者依然不会更相信它。',
                exam: 'emphasize the importance of 是写作首段提出论点的常用结构，比 It is important 地道得多。'
              }
            },
            {
              title: 'justify',
              index: 'justify',
              content:
                'justify vt. 证明……正当，为……辩护。词根 just(公正) + -ify(使……)，' +
                '字面「使它站到公正的那一边」。常考搭配 justify doing sth 证明做某事是有道理的；' +
                'justify the decision 为这个决定辩护；be justified in doing 有理由做某事。' +
                '易混点：justify 是「给出理由证明合理」，语气偏据理力争；' +
                'excuse 是「为过失开脱」，语气偏道歉；' +
                '另注意 justify 后面不能接 that 从句，这是四级写作的高频语法错点。',
              keywords: ['justify', '证明正当', 'just', '-ify', '辩护', '理由', 'justify doing'],
              aids: {
                core: 'justify = 证明……正当，just(公正) + -ify(使……)，「使它站到公正一边」。',
                chain: 'just(公正) → justify 证明……正当 → justification 理由 → justice 正义 → adjust（ad- 向 + just）调整',
                structure: '①词性 vt. ②释义 ③词根 just+-ify ④搭配三组 ⑤与 excuse 辨析',
                contrast:
                  'justify（证明做法合理，据理力争）vs excuse（为过失开脱，带歉意）：' +
                  'justify the decision 为决定辩护 ✔，excuse his lateness 为他迟到开脱 ✔。抓住「有没有需要道歉的过失」这一点就够。',
                qa: '问：justify 后面的动作用什么形式？答：用动名词。justify 是「证明做它合理」，写 justify to do 或 justify that 从句都不规范。',
                scene: '想象你在会上被质疑「为什么又要改方案」，于是把三页数据一条条摆出来，说明不改的后果更严重——这个动作就是 justify。',
                mnemonic: 'just 公正 + ify 使…：\n摆理由，站到正的一边',
                analogy:
                  '像「天平的两边不断加砝码」：justify 的过程是往正确的一边加砝码，直到天平平了、结论站得住——被证明的是「做法合理」，不是「事实必然如此」。' +
                  '失效点：理由充分只说明合理，不等于结论正确；作文里 justify 得再漂亮也可能是错的论证。',
                exam: 'justify doing sth 是固定结构；写作里常用 justify the decision / justify the cost 来回应质疑。'
              }
            }
        ]
      },
      {
        title: '第 2 组 · 易混形容词',
        points: [
          {
            title: 'comprehensive',
            index: 'comprehensive',
            content:
              'comprehensive adj. 全面的，综合的。com-(完全) + pre-(预先) + hens(看见) + -ive，' +
              '「预先全部看到」，即涵盖全部内容。搭配 comprehensive survey 全面的调查；' +
              'comprehensive coverage 全面覆盖。' +
              '形近：comprehensible 可理解的；compulsory 强制的；conscientious 认真的。',
            keywords: ['comprehensive', '全面的', 'com-', 'pre-', 'hens', 'compulsory', 'conscientious'],
            aids: {
              core: 'comprehensive = 全面的，com-(全) + prehen(看)，「全部看进去」。',
              chain: 'prehen(看) → comprehensive 全面的 → comprehend理解 → comprehension 理解力',
              structure: '①释义 ②词根 ③搭配 ④四组形近词',
              contrast:
                'comprehensive（内容全）vs comprehensible（能懂）：' +
                'a comprehensive report 是「全面的报告」，comprehensible 是「看得懂的报告」。',
              qa: '问：comprehensive knowledge 是什么知识？答：全面的知识，不是不难懂的知识。',
              scene: '想象体检报告上的「全面检查」——每个项目都查了，不是「我看懂了」。',
              mnemonic: 'completely 全面 + comprehens = comprehensive。',
              analogy:
                '像「全景地图」：每个角落都画进去了，区别于「放大镜」只看细节。',
              exam: '写作替换 valuable 的高级词；注意与 compulsory（必修的）拼写区分。'
            }
          },
          {
            title: 'substantial',
            index: 'substantial',
            content:
              'substantial adj. 大量的，可观的；实质的。词根 sub-(下) + stant(站立)，' +
              '「站在下面的东西」，原指「基础的、根本的」。' +
              '搭配 substantial increase 大幅增长；substantial difference 显著差异；' +
              'substantial meal 丰盛的一餐。' +
              '形近：substantive 实质性的（正式用语）；substance 物质。',
            keywords: ['substantial', '大量的', 'sub-', 'stant', '增长', '实质的', 'substantive'],
            aids: {
              core: 'substantial = 大量的/实质的，sub-(下) + stant(站立)，「有份量的」。',
              chain: 'stant(站) → substantial 有分量的 → substance 物质 → substantiality',
              structure: '①两层释义 ②词根 ③三组搭配 ④与 substantive 辨析',
              contrast:
                'substantial（数量大）vs substantive（内容实质）：' +
                'a substantial meal 是「量大」，a substantive discussion 是「有实质内容」。',
              qa: '问：substantial increase 是增加得多还是增加得真？答：两者兼有，指「大幅增长」，数量和时间都明显。',
              scene: ' imagine 两份工资条，一份多出一大截——那份就是 substantial 的差别。',
              mnemonic: 'sub 下去 + stant 站 → 站得住底的 = 有分量的。',
              analogy:
                '像「实心的砖」和「空心砖」：substantial 是实心，有实在分量。',
              exam: '学术写作高频替换 considerable（相当大的），但 substantial 更强调「量的显著」。'
            }
          },
          {
            title: 'adequate',
            index: 'adequate',
            content:
              'adequate adj. 足够的，适当的。词根 ad-(向) + equ(等同) + -ate，「调到刚好相等的程度」，' +
              '即「不多不少正够」。常考搭配 adequate for 对……足够；be adequate to do 足以做；' +
              '名词 adequacy n. 充分性。易混点：adequate 只说「够用」，good 才有「好」的意思；' +
              '而且 adequate 常暗示「勉强够、并不宽裕」，这一点是四级完形的隐藏考点。',
            keywords: ['adequate', '足够的', 'ad-', 'equ', '适当', 'adequacy', '勉强够'],
            aids: {
              core: 'adequate = 刚好够，ad-(向) + equ(等同)，「调到正好相等」。',
              chain: 'equ(等同) → adequate 足够的 → adequacy 充分性 → adequate to 足以 → equ 等同',
              structure: '①词性 adj. ②两层释义 ③词根 ad-+equ ④搭配三组⑤与 enough/good 辨析',
              contrast:
                'adequate（刚好够，常含勉强意味）vs good（好）：' +
                'The room is adequate for four people 这间房住四个人够了（且不宽裕），The room is good 四人住得好。',
              qa: '问：adequate 和 enough 有区别吗？答：adequate 是形容词，能作定语和表语（an adequate supply）；enough 也能当形容词但多作后置定语或副词。',
              scene: '想象宿舍四个人一间，住得下但想再搬件柜子就转不开身——这就是 adequate 的状态：够用，仅此而已。',
              mnemonic: 'ad 向 + equ 平：\n调到刚好，够了',
              analogy:
                '像「水杯刻度线正好在液面」：adequate 就是水刚好到那条线，不多不少；' +
                '注意它和 sufficient 的差别在于 adequate 常常暗含「再添一点就不够了」的紧张感。' +
                '失效点：adequate 只管够不够，不管好不好，房间 adequate 不等于住得舒服，别把它当 good 用。',
              exam: 'be adequate to do 是固定结构，别写成 be adequate for doing；完形里adequate 常作「尚可」的暗含褒义。'
            }
          },
          {
            title: 'competent',
            index: 'competent',
            content:
              'competent adj. 有能力的，能胜任的。词根 compet(竞争、赶上) + -ent，「能跟人竞争而不落下」，' +
              '强调能力足够胜任。常见搭配 be competent for/at 有能力做……；' +
              'be competent to do 有能力做某事；competence n. 能力。' +
              '易混点：competent 是「够格、胜任」，qualified 更强调「拿过资格」；' +
              '注意它与 competitive（竞争激烈的）只差一个字母，意思完全不同。',
            keywords: ['competent', '有能力的', 'compet', '胜任', 'competence', 'competitive'],
            aids: {
              core: 'competent = 能胜任，compet(竞争) + -ent，「竞争不落下」。',
              chain: 'compet(竞争) → competent 有能力的 → competence 能力 → competitive 竞争激烈的',
              structure: '①词性 adj. ②释义 ③词根 compet+-ent ④搭配三组 ⑤与 competitive/qualified 辨析',
              contrast:
                'competent（有能力胜任）vs competitive（竞争激烈的）：' +
                'a competent teacher 教得不错的老师（能胜任），a competitive market 竞争激烈的市场（市场在争，不是人在争）。',
              qa: '问：competent 和 qualified 差在哪？答：competent 说「实际能干」，qualified 说「符合资格标准」，一个看表现一个看证书。',
              scene: '想象新来的实习生第一次独立完成报表，没出错也没人返工——同事会说 he is competent，这是对能力的肯定，不是对学历的肯定。',
              mnemonic: 'compet 竞争 + ent 人：\n能拼能扛就是行',
              analogy:
                '像「体能测试达标」：competent 不要求你破纪录，只要求每个项目都过线、没有短板。' +
                '而 competitive 是「别人跟你抢名额」，说的是环境紧张，跟你本人行不行无关。' +
                '失效点：competent 只讲够不够格，不讲出色不出色，别把它当 excellent 的同义词。',
              exam: 'competent 与 competitive 拼写只差 -ive- 一个字母，四级阅读里出现过无数次，别看错就乱选。'
            }
          },
          {
            title: 'consistent',
            index: 'consistent',
            content:
              'consistent adj. 一致的；始终如一的。词根 con-(共同) + sist(站立) + -ent，' +
              '字面「众人一起站在同一处」，所以核心义是「前后不矛盾」。' +
              '常考搭配 be consistent with 与……一致；a consistent effort 持续不断的努力；' +
              '名词 consistency n. 一致性。易混点：consistent 是「多次行为不矛盾」；' +
              'constant 是「持续不断、不断变化的」，constant temperature 是恒温，consistent temperature 是前后同一口径。',
            keywords: ['consistent', '一致的', 'con-', 'sist', '始终如一', 'be consistent with', 'consistency'],
            aids: {
              core: 'consistent = 一致的，con-(共同) + sist(站)，「大家站在同一处」。',
              chain: 'sist(站) → consistent 一致的 → consistency 一致性 → persist（per- 始终 + sist 站）坚持',
              structure: '①词性 adj. ②两层释义 ③词根 con-+sist ④搭配两组 ⑤与 constant/consistent 辨析',
              contrast:
                'consistent（多次之间不矛盾）vs constant（持续不断）：' +
                'His results are consistent across all tests 他各次成绩都稳定，a constant pressure 持续不断的压力。',
              qa: '问：be consistent with 后面能接人吗？答：一般接事物或说法（与……相符），如 His story is not consistent with the facts。',
              scene: '想象你连续三个月每天背 20 个词，一次没断——这不只是 constant（没断过），更是 consistent（方法和标准一直一样）。',
              mnemonic: 'con 共同 + sist 站：\n站成一排不乱',
              analogy:
                '像「一列队伍始终踩着同一个节拍器」：consistent 管的是「每一步的间距一样」，constant 管的是「从来没停过」。' +
                '所以坚持了但时快时慢的动作是 constant 而不一定 consistent。' +
                '失效点：consistent 只说明彼此不矛盾，不说明「都对」；两个数据都 consistent，也可能只是共用了同一个错误。',
              exam: 'be consistent with 是高频搭配；consistent / constantly / consistency 三兄弟常在同一段里一起考。'
            }
          },
          {
            title: 'flexible',
            index: 'flexible',
            content:
              'flexible adj. 灵活的，可弯曲的。词根 flex(弯曲) + -ible(能……的)，' +
              '字面「能弯的」，因此两义都通：物理上可弯，引申为制度上可调整。' +
              '常考搭配 flexible schedule 灵活的安排；flexible rules 灵活的规则；' +
              'be flexible about 对……持灵活态度。易混点：flexible 是「可以变形、能变通」；' +
              'versatile 是「多方面都能干」，侧重适用范围广，两者常被换用但不等价。',
            keywords: ['flexible', '灵活的', 'flex', '弯曲', 'flexible schedule', 'versatile'],
            aids: {
              core: 'flexible = 可弯的→灵活的，flex(弯曲) + -ible(能……的)。',
              chain: 'flex(弯) → flexible 灵活的 → flexibility 灵活性 → flex 弯（肌肉）→ reflex 反射',
              structure: '①词性 adj. ②两层释义 ③词根 flex+-ible ④搭配三组 ⑤与 versatile 辨析',
              contrast:
                'flexible（能变通，侧重方式可变）vs versatile（多面手，侧重适用范围广）：' +
                'flexible working hours 时间可调整 ✔，a versatile player 能打多个位置 ✔。',
              qa: '问：flexible 和 flexible 的区别是什么？答：flexible 是形容词，flexibility 是名词，写作里两者要按句子成分换用。',
              scene: '想象一根喝饮料的吸管：捏扁了再松手，它自己弹回原状——这就是 flexible 的本义「能弯又能复原」。',
              mnemonic: 'flex 弯曲 -ible 能：\n能弯能直，才叫灵活',
              analogy:
                '像「可调长度的拧盖吸管」：瓶口规格没变，但通过拉伸适配不同盒子——制度（瓶口）不变，执行方式（长度）可变。' +
                '对比 constant 的死板：constant 是瓶口和长度都焊死，flexible 只放开后者。' +
                '失效点：flexible 说的是「可变」，不等于「随便来」；原则问题上 flexible 是有限度的。',
              exam: 'flexible 拼写是 flex + ible（只有一个 i），别写成 flexable；flexibility 是作文里的高频替换词。'
            }
          },
          {
            title: 'relevant',
            index: 'relevant',
            content:
              'relevant adj. 相关的，切题的。词根 re-(回) + relev(关联、带回)，' +
              '字面「能带回来关联上的」，即与所谈之事挂得上钩。' +
              '常考搭配 be relevant to 与……有关；relevant information 相关信息；' +
              '名词 relevance n. 相关性（也用于「现实意义」）。易混点：relevant 是「切题的」；' +
              'reliable 是「可靠的」，两者都常以 re- 开头且意思都是「可信」，' +
              '但一个讲「搭不搭得上」，一个讲「可不可信」，是四级阅读最经典的偷换概念点。',
            keywords: ['relevant', '相关的', 're-', 'relev', 'reliable', 'relevant to', 'relevance'],
            aids: {
              core: 'relevant = 切题的，re-(回) + relev(关联)，「拉得上关系」。',
              chain: 'relev(关联) → relevant 相关的 → relevance 相关性 → relate 关联 → relay 中继',
              structure: '①词性 adj. ②释义 ③词根 re-+relev ④搭配两组 ⑤与 reliable/relevant 辨析',
              contrast:
                'relevant（与话题有关、切题）vs reliable（可以信赖、可靠）：' +
                'a relevant analogy 一个切题的类比 ✔，a reliable source 一个可靠的来源 ✔。切题≠可信，数据既relevant 又 reliable 才有用。',
              qa: '问：relevant 和 relative 是一回事吗？答：不是。relative 是「相对的」（relative price 相对价格），relevant 是「相关的」，只看 rel 相同，后半段完全不同。',
              scene: '想象你在讲「如何提高睡眠质量」，此时插一句「这篇论文有 30 页」——句子本身没错，但和话题无关，所以不 relevant。',
              mnemonic: 're 回来 + relev 联：\n拉得上钩，切题',
              analogy:
                '像「磁铁吸铁屑」：relevant 的词会被话题这块磁铁吸过来，吸住的才是相关；吸不住的一堆词再正确也只是在旁边摆着。' +
                '对比 reliable：磁铁强弱说的是「能不能吸住」，不是「铁屑纯不纯」。' +
                '失效点：切题只是必要条件，不等于有说服力；一段很 relevant 的闲话依然什么都没证明。',
              exam: 'relevant to 是唯一常用搭配；四级里relevant / reliable / relative 三词互换设选项，正确率几乎为零，务必抓后半段词根。'
            }
          }
        ]
      },
      {
        title: '第 3 组 · 高频名词（阅读里出现率最高的一批）',
        points: [
          {
            title: 'factor',
            index: 'factor',
            content:
              'factor n. 因素，要素；vt. factor in 把……考虑进去。词根 fac-/fec（做）+ -tor（人），' +
              '原指「做事的人」，后来转成「促成事情的那个东西」。' +
              '常考搭配 a key factor 关键因素；contributing factor 起作用的因素；factor in 把……计入。' +
              '易混点：factor 泛指「影响结果的任一因素」，中性且可数；' +
              'cause 强调「直接导致结果的原因」，通常已经带上了因果判断。',
            keywords: ['factor', '因素', 'fac', 'fec', '要素', 'key factor', 'contributing'],
            aids: {
              core: 'factor = 因素，fac(做) + -tor(人)，「参与做事的那个东西」。',
              chain: 'fac(做) → factor 要素 → factory（fac + -ory，作坊）→ affect（af- + fect 做，影响）',
              structure: '①词性 n./vt. ②两层释义 ③词根 fac-+-tor ④搭配三组⑤与 cause/source 辨析',
              contrast:
                'factor（众多影响因素之一，中性）vs cause（直接造成结果，带因果判断）：' +
                'Price was a contributing factor 价格是起作用的一个因素 ✔，the cause of the accident 事故的直接原因 ✔。',
              qa: '问：factor 和 cause 能互换吗？答：不能。写作里用 factor 表示「众多因素之一」，用 cause 才认定它就是那个原因。',
              scene: '想象你查一栋楼停电的原因，物业列出一长串：老化线路、同时用电过多、某个开关故障——每一项都是 factor，但没有一项是 the cause 之前不能断定。',
              mnemonic: 'fac 做 + tor 人：\n做事的角色，是要素',
              analogy:
                '像「一锅汤的味道」：盐、火候、水量、食材都是 factor，缺一个味道都会偏；' +
                '但只有盐放咸了，才是「这次咸的直接 cause」——因素是并排的清单，原因是其中一条被按下的按钮。' +
                '失效点：列出 factor 不等于找出原因，说「有三个因素」只是承认没查完。',
              exam: 'contributing factor（促成因素）是四级阅读固定搭配，比 factor 得分更高；factor in 用于「把……算进去」。'
            }
          },
          {
            title: 'issue',
            index: 'issue',
            content:
              'issue n. 问题，争议；（报刊）期号；（正式）发行 vt. 发布，发行。' +
              '词源拉丁语 exitus「走出去的东西」，字面「流出去」，本指货物发行，引申为「抛出来的问题」。' +
              '常考搭配 a controversial issue 有争议的问题；raise an issue 提出问题；' +
              'the latest issue 最新一期。易混点：issue 偏「争议性、需要讨论的社会问题」；' +
              'problem 泛指任何待解决的不便；question 只指「疑问」，不含待解决这层意思。',
            keywords: ['issue', '问题', '争议', '期号', '发行', 'raise an issue', 'problem'],
            aids: {
              core: 'issue = 问题/期号/发行，源出exit（走出去），「抛出来给大家看的东西」。',
              chain: 'exit(出去) → issue 发行/问题 → exterior外部 → external 外部的',
              structure: '①词性 n./vt. ②三层释义③词源 exit ④搭配三组 ⑤与 problem/question 辨析',
              contrast:
                'issue（有争议、需讨论的社会议题）vs problem（任何待解决的不便）：' +
                'Housing is a serious issue in this city 住房是这座城市的重大议题 ✔，I have a problem with my bike 我自行车出毛病了✔。',
              qa: '问：issue 的「问题」义和「期号」义怎么区分？答：看搭配——raise/resolve an issue 是问题，the May issue 是期号，靠后面接的名词判断。',
              scene: '想象一本杂志摊在桌上，你看的既是一期具体的 issue（2019 年 5 月），也在读它提出的 issue（隐私保护那个争议话题）——同一个词两处义。',
              mnemonic: 'exit 出去 + ue 出：\n抛出来，是议题',
              analogy:
                '像「把东西倒出门口」：issue 的本义是把货物发放出去，后来引申为「把一个问题抛进公众讨论」。' +
                '对比 problem：problem 像是东西在你家里坏了（私事），issue 是已经摆到街面上、大家都看见了。' +
                '失效点：issue 中性，它不保证问题严重，raise an issue 也只是「提出」，不代表有人处理。',
              exam: 'issue 的三个义项在四级都考过：a serious issue 社会议题 / the latest issue 最新一期 / issue a report 发布报告。'
            }
          },
          {
            title: 'resource',
            index: 'resource',
            content:
              'resource n. 资源，财力；（pl.）resources 财力，资源储备。' +
              '词根 re-(再、回) + source(源)，字面「反复去取用的源泉」，强调「能一再取用、能再生」。' +
              '常考搭配 natural resources 自然资源；human resources 人力资源；' +
              'resource management 资源管理；a valuable resource 宝贵资源。' +
              '易混点：source 是「源头」（水从哪来、资料出处），只强调出处；' +
              'resource 强调「可利用的储备」，重点在「能用多少」，所以 resource 通常不与of 搭配，而 source 常接 from。',
            keywords: ['resource', '资源', 're-', 'source', 'natural resources', 'human resources', 'source'],
            aids: {
              core: 'resource = 资源，re-(再) + source(源)，「能一再去取的源泉」。',
              chain: 'source(源) → resource 资源 → resurgent（re- 再 + surg 波涌）再起 → source 源头',
              structure: '①词性 n. ②两层释义 ③词根 re-+source ④搭配三组⑤与 source 辨析',
              contrast:
                'resource（可利用的储备）vs source（出处）：' +
                'water resources 水资源（储量多少），the source of the river 河的源头（从哪里来）。一个问「有多少」，一个问「在哪」。',
              qa: '问：为什么说 resources 作「财力」讲时用复数？答：英语习惯用 resources 表示整体资源储备、资金实力，如 a country rich in resources。',
              scene: '想象图书馆里你能反复借还的那批书，这就是 resource——重点不在「书从哪来」，而在「这一批还能给我用多久」。',
              mnemonic: 're 再取 + source 源：\n取之不尽，是资源',
              analogy:
                '像「水箱里的存水」：source 是自来水管进来的那个接口，resource 是水箱里现在存着多少、能撑几天。' +
                '两个接口接的是同一根管子，但一个讲来路，一个讲存量。' +
                '失效点：resource 强调「可用量」，接不接得上（source of supply）它不管，所以别用 resource 去问出处。',
              exam: 'natural resources / human resources 是四级阅读与作文双高频短语；resource 一般不与 of 连用。'
            }
          },
          {
            title: 'tendency',
            index: 'tendency',
            content:
              'tendency n. 倾向，趋势，癖性。词根 tend(伸展、趋向) + -ency，' +
              '来自拉丁语 tendere「伸展」，字面「被拉长的方向」。' +
              '常考搭配 a tendency to do sth 有做某事的倾向；' +
              'a growing tendency 日益增长的趋势；show a tendency for 对……表现出倾向。' +
              '易混点：tendency 偏「人或事物内部的倾向」，且常暗含「这个倾向不太好、需要干预」；' +
              'trend 是客观时间序列上的总体走向，中性，如 a growing trend。',
            keywords: ['tendency', '倾向', '趋势', 'tend', 'tendency to do', '癖性', 'trend'],
            aids: {
              core: 'tendency = 倾向/趋势，tend(伸展) + -ency，「被拉长指向的那一边」。',
              chain: 'tend(伸展) → tendency 倾向 → tend 照料（顺着照料）→ tension（tend 伸）紧张',
              structure: '①词性 n. ②两层释义 ③词根 tend+-ency ④搭配三组 ⑤与 trend 辨析',
              contrast:
                'tendency（某人/某物的倾向，常带负面）vs trend（时间上的总体走向，中性）：' +
                'a tendency to overwork 过度操劳的倾向 ✔，the trend of remote work 远程办公的潮流 ✔。',
              qa: '问：tendency 后面怎么接？答：接 to do sth 或 to sth（介词），不接 doing，也不接 to be。',
              scene: '想象你做一份自我分析：「他一到考试前就有 tendency to 熬夜」，看的是这个人身上的惯常走向；换成「过去五年考研报名 trend 下降」，那说的是所有人。',
              mnemonic: 'tend 伸展 + ency 向：\n被拉过去的方向',
              analogy:
                '像「挂在坡上的球」：tendency 说的是这个球自己在往哪边偏（内因，居多），trend 说的是整个坡在往哪边倾（外势，全局）。' +
                '所以同一个人有 tendency 未必形成 trend，趋势也未必出于任何人。' +
                '失效点：英语里 tendency 常带批评色彩，但语法上并非贬义，中文的「倾向」更中性一点。',
              exam: 'tendency to do sth 是唯一正确搭配（2015 年考过 tendency to be）；写作用它替换 the trend 可避免重复。'
            }
          },
          {
            title: 'evidence',
            index: 'evidence',
            content:
              'evidence n. 证据，证明（不可数名词）。词根 e-(向外) + vid(看见)，' +
              '字面「看得出来的东西」，所以 evidence 就是「能被看见、能摆上台面的凭据」。' +
              '常考搭配 evidence of/for/about 关于……的证据；' +
              'strong/direct evidence 强有力的/直接证据；gather evidence 收集证据；' +
              'be supported by evidence 有证据支持。易混点：evidence 不可数，不能加 s；' +
              'proof 强调「足以定论」或「校样」，日常学习中proof 更偏「确凿的证明」，两者层次不同。',
            keywords: ['evidence', '证据', '不可数', 'e-', 'vid', '看见', 'strong evidence'],
            aids: {
              core: 'evidence = 证据（不可数），e-(出) + vid(看见)，「看得见的那份凭据」。',
              chain: 'vid(看见) → evidence 证据 → evident（e- + vid + ent）明显的 → vision 视觉',
              structure: '①词性 n. ②释义 ③词根 e-+vid ④搭配三组 ⑤与 proof 辨析',
              contrast:
                'evidence（证据材料，可多可少但不可数）vs proof（足以定论的证明）：' +
                'There is evidence that he lied 有证据表明他撒谎 ✔，That is proof that he lied 这就能证明他撒谎 ✔（更重）。',
              qa: '问：为什么不能说 evidences 或an evidence？答：evidence 是不可数名词，没有复数，也不能用 a/an 修饰「一份证据」这个意思。',
              scene: ' imagine你在法庭上把一段录像、一份签了字的合同、一张转账截图按顺序摆在桌上——每一样加起来才构成 evidence，任何单一样本都不等于 proof。',
              mnemonic: 'e 出 + vid 见：\n拿得出来的证据',
              analogy:
                '像「案发现场的照片」：evidence 是所有能摆出来的东西，一件不说明什么；proof 是把它们串起来后剩下的那句结论。' +
                '照片本身不是 proof，照片指向的「谁在场」才是。' +
                '失效点：evidence 只能支持「已发生的事」，无法证明「以后一定怎样」，别拿证据说预测。',
              exam: '考过evidence 的词性：a piece of evidence ✔，evidences ✘；be supported by evidence 是阅读高频句式。'
            }
          },
          {
            title: 'aspect',
            index: 'aspect',
            content:
              'aspect n. 方面；外观。词根 a-/ad-(向、朝) + spect(看)，' +
              '字面「朝着某个方向看到的样子」，本指外貌外观，引申为「事情的一个侧面」。' +
              '常考搭配 every aspect of each aspect? 常见为 every aspect of ……的每一个方面；' +
              'in every aspect 在各方面；the financial aspect 经济方面；' +
              'look at sth from a different aspect 从不同角度看。' +
              '易混点：aspect 讲「事物自身的一个侧面」；factor 讲「影响结果的因素」；' +
              'respect 现在也常说 in that respect（在那方面），但那是旧用法，口语里更自然说 in that sense。',
            keywords: ['aspect', '方面', '外观', 'spect', '看', 'in every aspect', 'factor'],
            aids: {
              core: 'aspect = 方面，a-(向) + spect(看)，「朝那边看到的那一面」。',
              chain: 'spect(看) → aspect 方面 → inspect（in 朝内看）检查 → respect（re 回看）方面/尊敬',
              structure: '①词性 n. ②两层释义 ③词根 a-+spect ④搭配三组⑤与 factor/respect 辨析',
              contrast:
                'aspect（事物的一个侧面）vs factor（影响结果的因素）：' +
                'the legal aspect 法律层面 ✔（说的是侧面），a key factor 关键因素 ✔（说的是影响力）。看侧面不需要它起作用，起作用的才是 factor。',
              qa: '问：in every aspect 和 in every way 一样吗？答：接近但侧重不同，aspect 强调「侧面、层面」，way 强调「方式、途径」。',
              scene: ' imagine你挑一台相机，分别看四个侧面：画质、手感、续航、价格。这四项是同一个产品的四个 aspect，其中「续航」可能才真正影响你买不买。',
              mnemonic: 'a 向 + spect 看：\n转一面看一面',
              analogy:
                '像「转动一只多面的棱镜」：东西只有一个，转到哪个侧面，就看到哪一面；换侧面不等于换东西。' +
                '对比 factor：factor 是棱镜外面射进来的光（外界影响），aspect 是你看到的表面。' +
                '失效点：一个事物可以有很多 aspect，但你能同时看全的面数受角度限制，「我没看到别的方面」不等于不存在。',
              exam: 'aspect 常见搭配 in every aspect / from the legal aspect；写作用于「从某角度看」的过渡句非常好用。'
            }
          },
          {
            title: 'approach',
            index: 'approach',
            content:
              'approach n. 方法，途径；接近 v. 靠近，着手处理。词根 ap-(向) + proach(靠近)，' +
              '字面「走向近处」，名词引申为「走近这件事的路子」。' +
              '常考搭配 an approach to doing sth 做某事的方法（注意 to 是介词）；' +
              'a new approach to the problem 解决问题的新方法；' +
              'approach the problem 处理这个问题；at the approach of 在……即将到来时。' +
              '易混点：approach to 后必须接名词或动名词；method 只讲「具体做法」，' +
              '而 approach 还含「看待这件事的角度和路子」，所以常说 a different approach。',
            keywords: ['approach', '方法', '途径', 'ap-', 'proach', 'approach to', 'method'],
            aids: {
              core: 'approach = 方法/靠近，ap-(向) + proach(近)，「走近它的路」。',
              chain: 'proach(近) → approach 接近/方法 → approachable 平易近人的 → reproach 责备',
              structure: '①词性 n./v. ②三层释义 ③词根 ap-+proach ④搭配三组⑤与 method 辨析',
              contrast:
                'approach（含看待问题的角度与整套路子）vs method（具体操作步骤）：' +
                'We need a different approach to this problem 换个思路 ✔（角度），We tried a different method 换了做法 ✔（步骤）。',
              qa: '问：an approach to doing 和 an approach to do 哪个对？答：只能接动名词，approach 后的 to 是介词，写 to do 就把动词当名词用了。',
              scene: ' imagine同一个学生数学差，你换三种approach：换讲法（角度）、换练习（方法）、换同伴（同伴效应）——换思路未必立刻见效，但这正是 approach 讲的事。',
              mnemonic: 'ap 朝 + proach 近：\n走近一步，是方法',
              analogy:
                '像「同一扇门的几种走法」：门口没变，走向它的路子可以不同，approach 记的是「怎么走过去」；method 记的是「门怎么开」。' +
                '所以 approach 换一换往往通向完全不同的解法，method 换一换只是换了个步骤。' +
                '失效点：approach 到门口不等于进了门，选对路子还得真动手做，approach 只是前期判断。',
              exam: 'approach to + 动名词是最高频语法点；a new approach to sth 是四六级作文里的高级表达。'
            }
          }
        ]
      },
      {
        title: '第 4 组 · 副词与形容词比较级（写作提分最快的一组）',
        points: [
          {
            title: 'significantly',
            index: 'significantly',
            content:
              'significantly adv. 显著地，重大地。词根 sign(记号、符号) + -ific(使……) + -ly，' +
              '字面「带着明显记号地」，引申为「差别大到能被看出来」。' +
              '常考搭配 significantly improve/increase 显著提高/增长；' +
              'significantly different 差异显著；differ significantly 相差显著。' +
              '易混点：significantly 强调「显著、有统计意义或肉眼可辨」；' +
              'considerably 强调「量大」，两者都译「大幅」，但 considerably 更偏数量、significantly 更偏重要性与可辨度。',
            keywords: ['significantly', '显著地', 'sign', '记号', 'increase', 'considerably'],
            aids: {
              core: 'significantly = 显著地，sign(记号) + -ly，「有明显记号地」。',
              chain: 'sign(记号) → significant 显著的 → significance 重要性 → signify 表示 → assign 分配',
              structure: '①词性 adv. ②释义 ③词根 sign+-ific+-ly ④搭配三组 ⑤与 considerably 辨析',
              contrast:
                'significantly（可被看见/测出的显著变化）vs considerably（数量上相当大的量）：' +
                'Sales increased significantly 销售额显著增长 ✔，The cost is considerably higher 成本高得多 ✔（只说数额）。',
              qa: '问：significantly 和 greatly 哪个更学术？答：significantly 更学术，也更适合数据类描述；greatly 常接抽象名词（greatly improve）。',
              scene: ' imagine体检报告上某项指标旁边多了一个箭头符号，那个箭头就是 sign——significantly 就是「带着这个箭头」的程度。',
              mnemonic: 'sign 记号 + ly 地：\n有记号，才叫显著',
              analogy:
                '像「音量旋钮刻度」：significantly 指一下拨过了整格，声音变化能被听出来；considerably 指一下从30% 拨到 60%，量大但刻度上不一定刺眼。' +
                '所以显著之处的关键是有没有一个明确的阈值。' +
                '失效点：statistically significant（有统计显著性）有一套判定标准，不能凭感觉说显著。',
              exam: '写作替换 very 的首选：significantly more effective（明显更有效）；四六级作文评分里词汇分就靠这类替换。'
            }
          },
          {
            title: 'respectively',
            index: 'respectively',
            content:
              'respectively adv. 分别地，各自地。词根 respect(关系、对应) + -ly，' +
              '字面「按照对应的关系来」，所以它永远成对出现：A and B respectively。' +
              '常考搭配 A, B and C respectively 分别是 A、B、C；' +
              'prices were $5, $8 and $12 respectively 三个价格分别是……；' +
              '分别对应前面几个名词。易混点：respectively 必须有「一一对应」；' +
              'individually 只说「各自、单独地」，没有对应关系；' +
              'respectively 常被误用来表达「分别地讨论」，那是没有对应对象的。',
            keywords: ['respectively', '分别地', 'respect', '对应', 'A and B respectively', 'individually'],
            aids: {
              core: 'respectively = 分别地，respect(对应) + -ly，「按对应的顺序一一配」。',
              chain: 'respect(对应/尊重) → respectively 分别地 → respective各自的 → regardless不管（与它相反：不管对应）',
              structure: '①词性 adv. ②释义 ③词根 respect+-ly ④搭配两组 ⑤与 individually/each 辨析',
              contrast:
                'respectively（按顺序一一对应）vs individually（各自单独，互不对应）：' +
                'Income and expenditure rose 12% and 8% respectively 收支分别上升12% 和 8% ✔，each item must be checked individually ✔。',
              qa: '问：respectively 能单独用吗？答：不能，它必须紧跟在前面那串并列项后面，一旦隔开就失去了「对应谁」的依据。',
              scene: ' imagine你把三张卡片正面朝下排成一行，然后按顺序翻开——「分别是 A、B、C」这个动作就是 respectively，必须先有那一行顺序。',
              mnemonic: 'respect 对应 + ly 地：\n一二三，对号入座',
              analogy:
                '像「报号取物」：叫 1 号的拿 1 号的东西，叫 2 号的拿 2 号的，号和物严格配对，这就是 respectively。' +
                '对比 individually：各自行动的人互相不看号也不管别人拿的是几号。' +
                '失效点：并列项超过三四个时respectively 容易让人数错，宁可拆成两句说。',
              exam: 'respectively 与 respective 都要记：the respective owners 各自的主人（形容词）/ for each region respectively 分别地（副词）。'
            }
          },
          {
            title: 'considerably',
            index: 'considerably',
            content:
              'considerably adv. 相当大地，显著地。词根 consider(考虑) + -able(可……的) + -ly，' +
              '字面「值得consider的程度」，指幅度不小。常考搭配 considerably more 相当多；' +
              'considerably less 少得多；considerably improve 大幅改善；' +
              'considerably higher/drier 高得多/干燥得多。' +
              '易混点：considerably 修饰数量、价格、差距大；significantly 修饰变化明显、有意义；' +
              '明显更「小」的多用 considerably（much less），语法上 considerably 修饰比较级最自然。',
            keywords: ['considerably', '相当大地', 'consider', '-able', 'much more', 'considerably less'],
            aids: {
              core: 'considerably = 相当大地，consider(考虑) + -able + -ly，「幅度不小」。',
              chain: 'consider(考虑) → considerable 相当大的 → considerably 相当大地 → considerate 体贴的',
              structure: '①词性 adv. ②释义 ③词根 consider+-able+-ly ④搭配三组 ⑤与 significantly 辨析',
              contrast:
                'considerably（量上差得多）vs significantly（变化可被察觉、有意义）：' +
                'The bill was considerably higher 账单高得多 ✔（纯数额），The reform significantly changed practice ✔（有影响）。',
              qa: '问：considerable 和 considerate 怎么区分？答：considerable 是「相当大的」，considerate 是「考虑周到的、体贴的」，后者用来形容人。',
              scene: ' imagine两个数字写在黑板上：3 和 300，你能一眼看出「差得不止一点」——这就是 considerably，它只管幅度，不管这项差异有没有意义。',
              mnemonic: 'consider 考虑 + ly：\nconsider 得够多，就相当大',
              analogy:
                '像「尺子上的刻度差」：considerably 是从 3 量到 300，幅度大到不用细看；significantly 则是差了一点、但刚好越过了某个判定线（像体温 37.5 度那条线）。' +
                '一个讲幅度，一个讲阈值。' +
                '失效点：considerably 不带褒贬，「贵得多」可以是坏事也可以是占便宜，看语境。',
              exam: 'considerably + 比较级（much more/less）是高频搭配；写作用来替换 very 提分最快，because 后可加 considerably。'
            }
          },
          {
            title: 'gradually',
            index: 'gradually',
            content:
              'gradually adv. 逐渐地。词根 grad(步、级) + -ual(的) + -ly，' +
              '来自拉丁语 gradus「台阶」，字面「一级一级地走」。' +
              '常考搭配 gradually increase/decline 逐渐上升/下降；' +
              'gradually change 逐渐改变；gradually become 逐渐变成；' +
              'the gradual increase 渐增（形容词）。易混点：gradually 强调「渐进、不跳跃」；' +
              'slowly 只强调「慢」，可能一路慢到底；' +
              'suddenly 是「突然」，与gradually 构成四级阅读最直接的对照。',
            keywords: ['gradually', '逐渐地', 'grad', '台阶', 'gradual', 'suddenly', 'slowly'],
            aids: {
              core: 'gradually = 逐渐地，grad(台阶) + -ly，「一级一级往上走」。',
              chain: 'grad(步) → gradually 逐渐 → gradual 渐进的 → degree（grad 步 + -ee）程度 → progress 前进',
              structure: '①词性 adv. ②释义 ③词根 grad+-ual+-ly ④搭配三组 ⑤与 slowly/suddenly 辨析',
              contrast:
                'gradually（有过程、一步一步）vs slowly（只说速度慢）：' +
                'Prices gradually rose over five years 五年间价格逐步上升 ✔，He walks slowly 他走得很慢 ✔（没说有没有过程）。',
              qa: '问：gradually 能修饰动词吗？答：可以，gradually improve / gradually get used to 都是标准用法；不要写成 gradually to improve。',
              scene: ' imagine天亮的过程：不是「啪」一下亮的，是光一点点漫过窗台、房间一格一格变亮——gradually 就是这个「一格一格」。',
              mnemonic: 'grad 台阶 + ual + ly：\n一级一级，逐步来',
              analogy:
                '像「看着钟表时针一格一格往前挪」：每一格都很小，但方向从不改变，这就是 gradually；' +
                'slowly 只是「挪得慢」，指针可能中途停一下、倒回来；suddenly 则是被人直接拨到了下一格。' +
                '失效点：渐变说明的是变化过程，最终结果仍可能变坏，gradually 不含褒义。',
              exam: '阅读里 frequently 与 gradually 常成对出现，用来判断趋势方向；形容词 gradual 也要会（a gradual shift）。'
            }
          },
          {
            title: 'primarily',
            index: 'primarily',
            content:
              'primarily adv. 主要地，首要地。词根 prim(第一) + -ary(的) → primary adj. 第一的、主要的，' +
              '再加 -ly。常考搭配 primarily responsible for 对……负主要责任；' +
              'primarily aimed at 主要旨在；primarily a research tool 首要是一个研究工具；' +
              'primarily composed of 主要由……组成。' +
              '易混点：primarily 是「按重要性排序，主要」，等于 mainly；' +
              'especially 是「在某个范围内尤其」，它一定在 already 划定的范围内做强调；' +
              'particularly 在口语里常被误当 especially，其实两者基本同义。',
            keywords: ['primarily', '主要地', 'prim', '第一', 'mainly', 'especially', 'primary'],
            aids: {
              core: 'primarily = 主要地，prim(第一) + -ary + -ly，「排第一的」。',
              chain: 'prim(第一) → primary 主要的 → primarily 主要地 → prime（prima 变形）首要的 → primitive 原始的',
              structure: '①词性 adv. ②释义 ③词根 prim+-ary+-ly ④搭配三组 ⑤与 especially 辨析',
              contrast:
                'primarily（主要、占第一位）vs especially（尤其是，在某个集合里挑出特殊项）：' +
                'It is primarily a research tool 它主要是个研究工具 ✔，It is useful, especially for beginners 它有用，尤其是对初学者 ✔。',
              qa: '问：primarily 和 mainly 有区别吗？答：意思几乎相同，但 primarily 更常用于正式与学术语境，mainly 更口语。',
              scene: ' imagine一份报告开头写「它主要是为了什么」，而不是「尤其是哪一点」——前者是给功能排序，后者是在一群功能里挑一个说。',
              mnemonic: 'prim 第一 + ly 地：\n排第一，就是主要',
              analogy:
                '像「餐厅主菜与加菜」：primarily 是主菜，先给你摆上来；especially 是加菜，是在主菜之外额外点名的那一道。' +
                '所以 especially 必须有already 在场的菜单，脱离范围用especially 就逻辑不通。' +
                '失效点：primarily 不排除别的作用，说「主要是」不等于「仅有」，别把它读成 only。',
              exam: 'primarily responsible for 是四级高频短语（谁负主要责任）；also 和 especially 在选项里常是干扰项。'
            }
          },
          {
            title: 'apparently',
            index: 'apparently',
            content:
              'apparently adv. 看来，似乎；据说。词根 ap-(向、朝) + par(显现) + -ent(的) + -ly，' +
              '来自 apparent「看得见的、表面的」，字面「按表面所示」。' +
              '常考搭配 apparently impossible 看来不可能；' +
              'apparently the case 情况看来如此；it is apparently true 据说属实。' +
              '易混点：apparently 只是「表面上看起来」，说话人不保证；' +
              'obviously 是「显而易见（我真的这么认为）」；' +
              'clearly 表示说话人肯定结论清楚。四级阅读里 apparently 常暗含「其实未必如此」，是反转信号。',
            keywords: ['apparently', '看来', '似乎', 'ap-', 'par', '显现', 'apparent'],
            aids: {
              core: 'apparently = 看来如此，ap-(朝) + par(显现) + -ly，「只按表面所见」。',
              chain: 'par(显现) → apparent 表面明显的 → apparently 看来 → apparent（to sb）→ transparent 透明的（trans 透）',
              structure: '①词性 adv. ②释义 ③词根 ap-+par+-ent+-ly ④搭配两组 ⑤与 obviously 辨析',
              contrast:
                'apparently（看起来如此，未必如此）vs obviously（显而易见，说话人肯定）：' +
                'The door was apparently locked 门看起来是锁着的（其实可能没锁），It is obviously wrong 这显然错了 ✔。',
              qa: '问：apparently 是不是等于 of course？答：不是，恰恰相反，apparently 保留了「我不确定」这层意思。',
              scene: ' imagine你隔着毛玻璃看见门外站着一个人，你只能说 apparently 有人；但你要写成 obviously 有人，就等于替事实打包票了。',
              mnemonic: 'ap 朝 + par 现 + ly：\n只凭表面，看来如此',
              analogy:
                '像「隔着一层雾看山」：apparently 是「看起来像一座山」，雾一散可能发现是块巨石；obviously 是「不管谁来看都能认出是座山」。' +
                '所以 apparently 里面始终留着一个「可能不是」，而 obviously 不留余地。' +
                '失效点：apparently 修饰名词时等于 seem，如 an apparently reasonable offer，别当成「据说某人说」。',
              exam: 'apparently 是阅读里的反转信号词：句中一旦出现它，后面往往紧跟 but 或 actually 推翻前句。'
            }
          },
          {
            title: 'consequently',
            index: 'consequently',
            content:
              'consequently adv. 因此，所以。词根 con-(共同、跟随) + sequ(跟随) + -ent + -ly，' +
              '来自 consequent「随之而来的」，字面「跟着前面那件事发生的」。' +
              '常考搭配 consequently 表因果；and consequently 并且因此；' +
              'consequently 导致……（正式书面因果词）。' +
              '易混点：consequently 强调「顺着推出一个结果」，位置多在句中或句首；' +
              'therefore 多在句首并用逗号隔开；' +
              'consequent（adj. 随之而来的）反过来修饰名词：the consequent effect 随之而来的影响。',
            keywords: ['consequently', '因此', '所以', 'con-', 'sequ', 'consequent', 'therefore'],
            aids: {
              core: 'consequently = 因此，con- + sequ(跟随) + -ent + -ly，「随之而来的」。',
              chain: 'sequ(跟随) → consequent 随之而来的 → consequently 因此 → sequence 顺序（跟踪随访）',
              structure: '①词性 adv. ②释义 ③词根 con-+sequ+-ent+-ly ④搭配两组 ⑤与 therefore/subsequent 辨析',
              contrast:
                'consequently（随之推出结果）vs subsequent（后来的）：' +
                'The costs rose and consequently profits fell 成本上升，因此利润下降 ✔，subsequent events 后来发生的事 ✔（不必然是结果，只是时间在后）。',
              qa: '问：consequently 和 therefore 可以换吗？答：意思可以换，但 consequently 更正式，且常放在句中用逗号隔开；therefore 几乎总在句首。',
              scene: ' imagine做因果链推演：第一步亮红灯，第二步就必然跟着亮黄灯，第三步才亮红灯——consequently 就是那条「所以」，它必须踩在前一步上。',
              mnemonic: 'con + sequ 跟随 + ly：\n跟着来，所以',
              analogy:
                '像「多米诺骨牌」：前面一张倒下，后面的才倒，这个「所以」就是 consequently；而 subsequent 只是说「后面那几张牌还没倒」。' +
                '一个讲因果，一个讲次序，别把二者混成一句。' +
                '失效点：consequently 只表达真实因果或说话人认定的因果，不表示「两者其实没关系」。',
              exam: '写作提分词：句首用 Consequently 替代 So，比口语化的 So better 用法得分高；对应形容词 consequent 也要会。'
            }
          }
        ]
      },
      {
        title: '第 5 组 · 动词短语与固定搭配（写作里最省力的一组）',
        points: [
          {
            title: 'account for',
            index: 'account for',
            content:
              'account for vi. 解释，说明（原因）；占（比例）。这里的 account 是「解释、说明」，' +
              'for 引出被解释的对象。常考搭配 This accounts for 30% of ... 占……的30%；' +
              'account for the delay 解释延误的原因；account for the difference 算清差距。' +
              '易混点：account for 的 for 是介词，后面接名词或动名词；' +
              'explain 后必须接宾语从句（explain why...），两者不能互换；' +
              '此外 account for 还有「归因于」之意，= attribute to。',
            keywords: ['account for', '解释', '占比例', '比例', 'account for 30%', 'attribute'],
            aids: {
              core: 'account for = 解释/占比例，account 是「账目、说明」，for 引出对象。',
              chain: 'count(数) → account(账目) → account for（把数说清楚）→ 占比例、解释 → accountant 会计',
              structure: '①词性 vi. ②两个义项 ③account 的本义 ④搭配三组 ⑤与 explain 辨析',
              contrast:
                'account for（后接名词或动名词，可占比例）vs explain（后接宾语从句）：' +
                'This accounts for 30% 占三成 ✔，This explains the delay 用从句 ✔。换成 This explains 30% 就错了。',
              qa: '问：account for 是百分号前还是后？答：都在后面，This accounts for 30% 和 30% is accounted for by this 都对。',
              scene: ' imagine你看一份统计表，一行行加下来，最后发现「这一项占了 60%」——你在做的正是 account for：把总数解释成各部分的份额。',
              mnemonic: 'account 账 + for 因：\n账算清楚，因和果就分开了',
              analogy:
                '像「给一份开销清单找主因」：account for 就是逐项追问「这笔钱去哪了」，追问出来的占比就是它给的比例。' +
                '对比 explain：explain 是把「为什么」说清楚，不负责把总数拆成几份。' +
                '失效点：占比例的那个「30%」必须是可量化的事实，不能用 account for 去解释一个没法量的概念。',
              exam: '议论文数据句首选account for（占比）；to account for 还等于 because of，作文里比 because of 更正式。'
            }
          },
          {
            title: 'result in',
            index: 'result in',
            content:
              'result in vt. 导致，造成（结果）。反义短语是 result from（由……造成），' +
              '方向相反，极易混淆。常考搭配 result in serious problems 导致严重问题；' +
              'result in damage/loss 造成损害/损失；a well-designed experiment resulted in 旨在。' +
              '易混点：result in 后接「结果」；result from 后接「原因」，且主语不同：' +
              'Carelessness resulted in accidents 粗心导致事故（accidents resulted from carelessness 事故源于粗心）。',
            keywords: ['result in', '导致', 'result from', '由…造成', 'damage', '因果方向'],
            aids: {
              core: 'result in = 导致，in 引出结果；result from = 由……造成，from 引出原因。',
              chain: 'result(结果) → result in 导致（in 朝结果）→ result from 源于（from 追来源）→ resultant adj.由此而来的',
              structure: '①词性 vt. ②释义 ③in/from 的方向 ④搭配三组⑤与 result from 辨析',
              contrast:
                'result in（因→果）vs result from（果→因）：' +
                'Overwork resulted in illness 过度工作导致生病 ✔，Illness resulted from overwork 生病源于过度工作 ✔。主语一换，介词就换。',
              qa: '问：为什么 result in 后面不能加 that 从句？答：result in 是动词短语，后接名词或动名词，不接句子。',
              scene: ' imagine一条单行道上的两辆车：一辆是原因、一辆是结果。前车走的方向决定了「结果 in 原因」还是「原因 from 结果」，但两条路不能同时开。',
              mnemonic: 'in 向结果，from 向源头：\n方向一反，句子就反',
              analogy:
                '像「倒水」：水从杯子倒进盆里，是 source in sink（来源进容器）；盆里的水倒回杯子，是 sink from source（容器里的退回来源）。' +
                '结果 in 原因 = 水进了盆，原因 from 结果 = 水出了盆。' +
                '失效点：这个比喻只能帮你判断方向，千万别在写作里把两者当同义词并列（due to 与 lead to 就是这么错的）。',
              exam: '翻译与改错高频：题中出现due to 与 lead to 并列，多半有一处方向错了。'
            }
          },
          {
            title: 'comply with',
            index: 'comply with',
            content:
              'comply with vi. 遵从，服从（规则、要求）。词根 com-(共同) + ply(弯、折叠)，' +
              '原义「把心折弯表示顺从」，所以 comply 的本质是「照着做」。' +
              '常考搭配 comply with the rules/regulations 遵守规章；' +
              'comply with the requirements 符合要求；in compliance with 与……一致（名词短语）。' +
              '易混点：comply with 是「照着规定做」，含被动、不情愿的服从色彩；' +
              'conform to 强调「与标准一致」；' +
              'obey 是日常词，obey the order 而不能说 obey to anything。',
            keywords: ['comply with', '遵从', '遵守', 'com-', 'ply', 'compliance', 'conform'],
            aids: {
              core: 'comply with = 遵从，com-(共同) + ply(弯)，「把心折弯照着做」。',
              chain: 'ply(弯、折叠) → comply with 遵从 → compliance 合规 → comply 是compliance 的动词',
              structure: '①词性 vi. ②释义 ③词根 com-+ply ④搭配三组 ⑤与 conform/obey 辨析',
              contrast:
                'comply with（照规定做，含不情愿）vs conform to（与标准相符，强调一致）：' +
                'They complied with the regulation 他们照章执行了 ✔，The design conforms to the standard 设计符合标准 ✔。',
              qa: '问：comply with 后面能接人吗？答：不能，它接规则、标准、要求等物，不接「人」。要接人得用 obey。',
              scene: ' imagine你收到一张整改通知，被要求把消防通道堆的杂物挪走。挪完之后就是 comply with——你未必觉得合理，但照做了。',
              mnemonic: 'com 共 + ply 弯：\n心一弯，规矩就守',
              analogy:
                '像「按模具压出来的形状」：材料本身不会主动变，是外部的模具（规章）决定它最后长什么样，这就是 comply。' +
                '对比 obey：obey 更像「听长辈的话」，带着服从关系的意味，多用于人。' +
                '失效点：comply 只说明行为符合要求，不保证要求本身合理，它不评价规则对不对。',
              exam: 'in compliance with 是写作替换 according to 的高级短语；记牢 comply with 的 with 不能省。'
            }
          },
          {
            title: 'adapt to',
            index: 'adapt to',
            content:
              'adapt to vi. 适应，顺应（新情况）。adapt 的整体含义是「改编、改造以适应」，' +
              '拆开记：ad-(向) + apt(适合)。常考搭配 adapt to change 适应变化；' +
              'adapt to the environment 适应环境；adapt to doing 习惯于做；' +
              'adapt oneself to 使自己适应（更正式）。' +
              '易混点：adapt to 是「适应」，adopt 是「采纳」（主动拿别人的东西来用），' +
              '字形只差两个字母，是四级选择题的常客；adapt 还可以接宾语表示「改编」（adapt a novel）。',
            keywords: ['adapt to', '适应', 'ad-', 'apt', '适合', 'adopt', 'adapt oneself to'],
            aids: {
              core: 'adapt to = 适应，ad-(向) + apt(适合)，「往合适的方向改造自己」。',
              chain: 'apt(适合) → adapt 使适合 → adapt to 适应 → adopt（ad- + opt 选）采纳 → aptitude 天资',
              structure: '①词性 vi. ②释义 ③词根 ad-+apt ④搭配三组 ⑤与 adopt/adjust 辨析',
              contrast:
                'adapt to（自己改变去适应环境）vs adopt（把别人的方案拿过来用）：' +
                'He adapted to the new environment 他适应了环境 ✔，The school adopted a new method 学校采纳了新方法 ✔。施动方向相反。',
              qa: '问：adapt to 和 adjust to 有区别吗？答：adapt to 常指较长期、整体性的适应；adjust to 更偏短期的调整、微调，两词常可换用但重心不同。',
              scene: ' imagine你从南方搬到北方，屋里暖气很干，你买了加湿器、也慢慢改掉了自己的作息习惯——这个「让自己贴合新环境」的过程就是 adapt to。',
              mnemonic: 'ad 向 + apt 宜：\n朝合适处，改自己',
              analogy:
                '像「给气球放气重新绑到新尺寸」：气球本身没换，但形状改了才塞得进新盒子，这就是 adapt。' +
                'adopt 则是直接换上别人给的气球，什么都不改就拿走。' +
                '失效点：适应不等于认同，你可能习惯了某项规则但依然反对它。',
              exam: 'adapt to doing sth 是高频点；adapt 后直接加宾语是「改编」（adapt a novel into a film），两种用法都要会。'
            }
          },
          {
            title: 'in terms of',
            index: 'in terms of',
            content:
              'in terms of 就……而言，从……方面看（书面高频短语）。' +
              'term 源自拉丁语 terminus「界限、终点」，字面「划出界限」，' +
              '所以 in terms of 就是「站在某个划定的维度里看」。' +
              '常考搭配 in terms of price 就价格而言；' +
              'in terms of efficiency 就效率来说；in terms of profit 从利润角度看；' +
              'the same in terms of cost 在成本上相同。' +
              '易混点：in terms of 后接名词或动名词；in the terms of 是「按照……的措辞」，两者差一个 the，意思完全不同。',
            keywords: ['in terms of', '就…而言', 'term', '界限', '就价格而言', 'in the terms of'],
            aids: {
              core: 'in terms of = 就……而言，term 原指「界限」，指明按哪个维度谈。',
              chain: 'term(界限、术语) → in terms of 就……而言 → terminology 术语 → terminal 终端（终点）',
              structure: '①词性短语 ②释义③term 的本义「界限」④搭配三组 ⑤与 in the terms of 辨析',
              contrast:
                'in terms of（就某个维度而言）vs in the terms of（依照……的措辞）：' +
                'Cheap in terms of price 价格上便宜 ✔，in the terms of the contract 按合同的措辞 ✔。一个有 the 一个没有。',
              qa: '问：in terms of 能接句子吗？答：不能，只能接名词或动名词；要说「在效率方面」就说 in terms of efficiency。',
              scene: ' imagine选一台手机，你在心里划了几道线：价格、续航、手感。in terms of 就是把这道线框出来，然后只谈这一项，不谈别的。',
              mnemonic: 'term 界限 + of：\n先划线，再谈线内',
              analogy:
                '像「把预算表分成几栏看」：in terms of cost 只看那一栏的钱，不牵扯别的栏；换一栏就是换一个 terms。' +
                '失效点：换维度会改变结论，一台机器 in terms of price 便宜，in terms of quality 可能最差，所以别拿一个维度下的结论概括全局。',
              exam: '写作提分替换 according to / as for；四级翻译题出现过 in terms of 的汉译英。'
            }
          },
          {
            title: 'lead to',
            index: 'lead to',
            content:
              'lead to vt. 导致，通向（结果）。词源 lead 源自古英语 leadan「引路」，' +
              'to 是介词「引到」。常考搭配 lead to serious problems 导致严重问题；' +
              'lead to improvements 导致改善；a well-designed experiment aimed to... 一项旨在……的实验。' +
              '易混点：lead to 后接名词或动名词，不接动词原形；' +
              'lead 与 take 都是「导致」，但 take 是搭配性更强（take place 举行/发生）；' +
              'pathway 和 way 更侧重「路径」而非因果。',
            keywords: ['lead to', '导致', '通向', 'lead', 'to', 'lead to problems', 'take place'],
            aids: {
              core: 'lead to = 导致/通向，lead 源自「引路」，把后果引出来。',
              chain: 'lead(引) → lead to 导致 → lead(线索) → leadership 领导 → leading 领先的',
              structure: '①词性 vt. ②两层释义 ③词源「引路」 ④搭配三组 ⑤与 take place 辨析',
              contrast:
                'lead to（因果关系，有因才有果）vs take place（事件发生，无因果来源）：' +
                'Carelessness led to the accident 粗心导致事故 ✔，The meeting will take place tomorrow 会议明天举行 ✔。',
              qa: '问：lead to 后面能接句子吗？答：不能，接名词或动名词；lead to sb to do 虽然口语偶见，但书面里改为 lead to doing 更规范。',
              scene: ' imagine一条河的上游塞了垃圾，下游的水就变黑了——上游是因、下游是果，中间隔着一段距离，这条「流过去」的路就是 lead to。',
              mnemonic: 'lead 引 + to 到：\n从前头引，到后头',
              analogy:
                '像「多米诺骨牌」：前面一张倒，才带着后面那张一起倒，这就是 lead to。' +
                'take place 则像「日历上写着有这回事」，它只是宣布时间地点，不解释它为什么在这儿。' +
                '失效点：lead to 说明机制上的因果，但未必说明责任，只是说 A 带来了 B。',
              exam: 'lead to / result in / lead in 三兄弟只考 lead to 与 result in；写作用 lead to 替换 cause 最高频。'
            }
          },
          {
            title: 'be aware of',
            index: 'be aware of',
            content:
              'be aware of 意识到，知情（形容词性短语）。词根 a-(已) + war(留心、看守)，' +
              '字面「已经留过心」，所以 aware 的本义是「心里有数」。' +
              '常考搭配 be aware of the risks 意识到风险；' +
              'be aware of the fact that 意识到……这一事实；' +
              'be aware that 从句；名词 awareness n. 意识（awareness of）。' +
              '易混点：aware of 后接名词；aware 后直接接从句；' +
              'be aware of 与 be conscious of 极近，但 conscious 更偏「能意识到、清醒」，aware 更偏「知道有这么回事」。',
            keywords: ['be aware of', '意识到', 'aware', 'war', '留心', 'awareness', 'conscious'],
            aids: {
              core: 'be aware of = 意识到，aware 源自「留心守看」，心里已经有数。',
              chain: 'war(留心、守) → aware 意识到的 → awareness 意识 → unaware（un- 不知）→ award（a- + war）奖',
              structure: '①词性短语 ②释义 ③词根 war ④搭配三组 ⑤与 conscious 辨析',
              contrast:
                'aware（知道有这么回事）vs conscious（处于清醒、能觉知状态）：' +
                'I was not aware of the change 我没察觉这个变化 ✔，He was conscious during the operation 他手术中清醒 ✔。',
              qa: '问：aware of 和 aware 的区别？答：aware of 后接名词，aware that 从句直接接句子，写成 aware of that 是语法错误。',
              scene: ' imagine你在读一份体检报告，前几页看得很顺，看到某一行时愣了一下——那一瞬间就是从「没意识到」切到「aware of」。',
              mnemonic: 'a 已 + war 守：\n留过心，才知情',
              analogy:
                '像「屋里本来没开灯，你没看见角落里的蜘蛛，现在手电一照，aware 了」—— awareness 只发生在「聚焦照到的那一刻」。' +
                '对比 conscious：conscious 是「灯一直亮着，人也一直清醒」，强调状态本身而非某次发现。' +
                '失效点：aware 只说明「知道了」，不说明「会去处理」，知道风险不等于采取行动。',
              exam: 'be aware of 是四级高频短语；名词 awareness of awareness 在环保、健康类阅读中高频出现。'
            }
          }
        ]
      },
      {
        title: '第 6 组 · 易混词辨析专项（形近、音近、义近，三者一起考）',
        points: [
          {
            title: 'comply / comprehensive / compulsory 辨析',
            index: 'comply',
            content:
              '本条把三级高频易混词放在一起对比：comply with（遵守）、comprehensive（全面的）、' +
              'compulsory（强制的），三个词都以 comp- 开头但意思完全不同。' +
              'comply 词根 ply「弯」，心一弯就照做，= obey，宾语是规则；' +
              'comprehensive 词根 prehen「看」，全部看进去，= all-inclusive；' +
              'compulsory 词根 puls「推」，被一起推着做，= required by law。' +
              '例：comply with the rules 遵守规章；a comprehensive survey 全面的调查；' +
              'compulsory education 义务教育。三者共用 comp-（共同），但一个折、一个看、一个推。',
            keywords: ['comply', 'comprehensive', 'compulsory', 'ply', 'prehen', 'puls', 'comp-'],
            aids: {
              core: 'comp- 三兄弟：ply弯＝遵守，prehen 看＝全面，puls 推＝强制。',
              chain: 'ply(弯) → comply 遵守 → prehen(看) → comprehensive 全面 → puls(推) → compulsory 强制',
              structure: '①三词同框 ②词根三分③释义对照④搭配三组 ⑤共同的 comp-',
              contrast:
                'comply with（动作，遵守）vs comprehensive（形容词，全面的）vs compulsory（形容词，强制的）：' +
                '三者拼写只差中间三四个字母，判定方法只有一个——看词根：弯的、看的、推的。',
              qa: '问：compulsory 是「自愿」还是「强制」？答：强制，由 compulsory education（义务教育）反推即可，它和 compulsory = required by law 同义。',
              scene: ' imagine你在填一张表，左边三栏标题只差几个字母：Compliant（全面的？不，是遵守的）、Comprehensive（全面的）、Compulsory（强制的），靠词根一个个认出来。',
              mnemonic: '弯合规，看全面，推强制：\n三个 comp- 各有根',
              analogy:
                '像「三个抽屉都写着 comp 开头」：第一个抽屉里放的是「弯腰点头表示服从」，第二个放的是「望远镜把全景看完」，第三个放的是「推着你前进的力」。' +
                '整理的方法只有一个：看它们各自带的后半截在做什么动作。' +
                '失效点：这套词根辨析只管选词，不管填搭配，compulsory 后不能加 with。',
              exam: '本组必考：选项里同时出现三者时，先划掉不含正确词根的那个。compulsory 后直接跟名词。'
            }
          },
          {
            title: 'adapt / adopt / adept 辨析',
            index: 'adapt',
            content:
              '三个词长得极像，词根各不同。adapt 词根 apt「适合」，ad-(向)合成「使适合」，' +
              '即改编以适应；adapt to the situation 适应形势。' +
              'adopt 词根 opt「选择」，ad-(向)合成「选过来用」，即采纳；adopt a policy 采纳政策。' +
              'adept 词根 apt 也是「适合」，但加 -t 变形容词，表示「熟练的、精通的」；' +
              'she is adept at solving puzzles 她擅长解谜。' +
              '一句话记法：adapt 改变自己去合适，adopt 拿别人的来用，adept 本来就合适（人）。',
            keywords: ['adapt', 'adopt', 'adept', 'apt', 'opt', '适合', '选择'],
            aids: {
              core: 'adapt（改造使适合，apt）｜ adopt（选过来用，opt）｜ adept（本来就精通，形容词）。',
              chain: 'apt(适合) → adapt 适应 → adept 熟练的 → opt(选择) → adopt 采纳 → opt 光学',
              structure: '①三词同框 ②词根三分③词性差异 ④搭配三组 ⑤一句话记法',
              contrast:
                'adapt（自己改造）vs adopt（采用别人的）vs adept（形容词，形容人精通）：' +
                'adapt to change 适应变化 ✔ / adopt a plan 采纳计划 ✔ / be adept at speech 擅长演讲 ✔。第三词是形容词，不能作动词用。',
              qa: '问：adept 是动词还是形容词？答：形容词，只作定语或表语（an adept player），不能带宾语。',
              scene: ' imagine一个演员：adapt 是她改戏路去演新角色；adopt 是她照着别人写的剧本演；adept 是她本来演技就好。',
              mnemonic: 'apt 适合我改，opt 选来我采用，\napt 加 t 变熟练',
              analogy:
                '像「改造一件工具」：adapt 是把它改窄一点好放进自己的工具箱；adopt 是直接把别人那把合手的拿走；adept 则是说你本来就会用这类工具。' +
                '失效点：adapt 改的是自己，adopt 拿的是别人的，施动对象不同，别在同一个句子里混用。',
              exam: '四级高频辨析题：adapt / adopt / adept 三选一；判断法是先看词根再看后面接名词还是介词。'
            }
          },
          {
            title: 'economic / economical 辨析',
            index: 'economic',
            content:
              'economic 与 economical 都译「经济的」，但economic 谈的是「与经济有关的」，' +
              'economical 谈的是「省钱的、不浪费的」。词根相同，词尾不同：' +
              '-ic 表示「与……有关」，-ical 在此进一步引申为「崇尚/偏向」。' +
              'economic growth 经济增长（宏观经济学）；' +
              'economic policy 经济政策；' +
              'an economical car 一辆省油节钱的车；' +
              'economical use of resources 节约使用资源。经济学类文章里 economic 出现频率极高。',
            keywords: ['economic', 'economical', 'economy', 'economic', '省钱的', '经济增长'],
            aids: {
              core: 'economic＝与经济有关的；economical＝省钱的省钱。词根都是 eco（管理、习俗）。',
              chain: 'eco(管理) → economy 经济 → economic 经济学的 → economical 节俭的 → economics 经济学',
              structure: '①两词并置②词根与词尾③搭配三组 ④经济类词汇群⑤判定方法',
              contrast:
                'economic（经济学意义上的，宏观）vs economical（个人花钱上的节俭，微观）：' +
                'The country is in an economic crisis 国家陷入经济危机 ✔，We need economical solutions 我们需要节约的办法 ✔。',
              qa: '问：economical 能当名词吗？答：不能，它是形容词；名词是 economics（经济学）和 economy（经济）。',
              scene: ' imagine一张图：左边是国家 GDP 曲线（economic），右边是你自己的购物小票（economical）。一个是宏观数字，一个是你省下的钱。',
              mnemonic: 'eco 经济 + ic 相关的，\n+cal 节约的',
              analogy:
                '像「两台相机拍同一件事」：economic 拍的是全城的账本（每个行业一条线），economical 拍的是你家的账本（每笔买菜多少钱）。' +
                '对象层次不同，不是同一个近义转换。' +
                '失效点：economical 的「省」只针对资源消耗，不表示东西便宜，别用它来表达「价格低」。',
              exam: '阅读里 economic 多与 crisis / growth / policy 搭配；作文用 economical 替换 cheap（省钱的）更准确。'
            }
          },
          {
            title: 'imagine / imaginary 辨析',
            index: 'imagine',
            content:
              'imagine 是动词「想象」，imagination 是名词「想象力」，' +
              'imaginary 是形容词「想象的、不真实的」，imaginary number 纯虚数（数学用法）。' +
              '完整词族：image 是可数名词「形象、影像」（an image of 一个影像），' +
              'imaginative 是形容词「富有想象力的」（an imaginative writer）。' +
              '例：imagine a world without money 想象一个没有钱的世界；' +
              'a vivid imagination 生动的想象力；the imaginary world 虚构的世界；' +
              'an imaginative solution 有想象力的办法。四级里最常错的是把 imaginative 当 imagine 用。',
            keywords: ['imagine', 'imagination', 'imaginary', 'imaginative', 'image', '虚构'],
            aids: {
              core: 'imagine 动词｜ imagination 名词｜ imaginary 虚构的｜ imaginative 有想象力的',
              chain: 'imag(形、像) → image 形象 → imagine 想象 → imaginary 虚构的 → imaginative 有想象力的',
              structure: '①词族四词并置②词性一一对应 ③搭配三组④形近词群里最易错的一组⑤判定法',
              contrast:
                'imagine（动词，想象）vs imaginary（形容词，虚构的）vs imaginative（形容词，有创造力的）：' +
                'imagine 后面必须能接一个句子或名词短语，imaginary 只能修饰名词，三者不能换位使用。',
              qa: '问：an imaginary number 是「想象出来的数」吗？答：不是，是数学上的「纯虚数」（如根号 -1），这是固定译法。',
              scene: ' imagine你在写作文描述一处从未去过的园林：imagine 是你脑子里的动作，imaginary 是你笔下那座园子（它不存在），imaginative 则是你这篇构思本身够不够巧。',
              mnemonic: 'v动词 imagine，\nn 名词 imagination，\nadj 虚构 imaginary',
              analogy:
                '像「画家和画布、画笔」：imagine 是脑子里起稿的那一下，imaginary 是画布上那个不存在的景，imaginative 是这位画家平时爱不爱想。' +
                '三者对应的是同一个动作的不同时态：想法、成品、习惯。' +
                '失效点：imaginary 并不等于「丑的或假的」，它只强调「并非真实存在」。',
              exam: '四级词形辨析常考 imagine / imaginary / imaginative / imaginative 三选一；imaginary number 是数学阅读高频短语。'
            }
          },
          {
            title: 'considerable / considerate 辨析',
            index: 'considerable',
            content:
              'considerable 形容词「相当大的」，considerate 形容词「考虑周到的」，' +
              '都是consider（考虑）加后缀，但一个谈数量、一个谈为人。' +
              'considerable amount of time 相当多的时间；' +
              'a considerable distance 相当远的距离；' +
              'considerable savings 相当可观的积蓄。' +
              'considerate behaviour 体贴的行为；' +
              'be considerate of others 为他人着想；' +
              'a considerate gift 体贴的礼物。' +
              '记忆抓手：considerable 里有个 able（能够），量级足够；considerate 里有 ate（吃），吃饭时想着别人。',
            keywords: ['considerable', 'considerate', 'consider', 'considerable amount', '体贴', '为他人着想'],
            aids: {
              core: 'considerable＝相当大的（量）；considerate＝体贴的（人）。consider＝考虑。',
              chain: 'consider(考虑) → considerable 相当大的 → considerate 体贴的 → consideration 考虑、体贴',
              structure: '①两词并置②词根 consider ③搭配三组 ④记忆抓手 able/ate⑤判定方法',
              contrast:
                'considerable（数量大，语气偏中性）vs considerate（为人着想）：' +
                'a considerable sum of money 一笔相当大的钱 ✔，a considerate son 一个体贴的儿子 ✔。一个不能用来形容人。',
              qa: '问：considerable 是褒义还是贬义？答：语法上中性，「相当大的」既可指好处也可指坏处，如 a considerable risk（相当大的风险）。',
              scene: ' imagine你形容一顿饭：considerable meal 是「分量相当足」；considerate waiter 是「服务员很体贴」。一个是数量，一个是态度。',
              mnemonic: 'consider+able 能，量够大；\nconsider+ate 吃，想着你',
              analogy:
                '像「看两样东西的尺子」：considerable 用尺子量大小，看的是数量；considerate 用镜子照自己，看的是你有没有想到别人。' +
                '同一根consider，量了物，也量了人。' +
                '失效点：considerable 不能用来评价一个人的性格，它只评事物的大小。',
              exam: '四级高频：a considerable amount of（后接不可数名词）是固定短语，也作 considerable time/money/savings。'
            }
          },
          {
            title: 'principle / principal 辨析',
            index: 'principle',
            content:
              'principal 是形容词「主要的」或名词「校长、负责人」，' +
              'principle 是名词「原则、原理」。词根都是 prim（第一），' +
              'principal 读「_PRIn-ci-pal」，principle 多一个结尾 -e，拼写必须分开记。' +
              'principal adj. 主要的（principal reason 主要原因）；' +
              'principal n. 校长（the school principal）、本金（principal and interest 本金与利息）。' +
              'principle n. 原则（a strong moral principle 强烈的道德原则）；' +
              'principle n. 原理、规律（the principle of supply and demand 供求原理）。' +
              '一个字母之差：一个管人（校长）和大小，一个管道理。',
            keywords: ['principle', 'principal', 'prim', '第一', '校长', '原则', '本金'],
            aids: {
              core: 'principal＝主要的/校长（人、钱）；principle＝原则、原理（道理）。多一个 -e 就讲道理。',
              chain: 'prim(第一) → principal 主要的/校长 → principle 原则/原理 → primary 主要的 → prime 首要的',
              structure: '①两词并置②词根 prim ③拼写与读音 ④搭配三组 ⑤一句话判定法',
              contrast:
                'principal（人、钱、比重上的主要部分）vs principle（抽象的道理）：' +
                'the principal cause 主要原因 ✔，the principle of free trade 自由贸易原理 ✔。前者能当校长，后者不能。',
              qa: '问：principal money 和 principle 怎么记？答：principal 是「本金」这笔钱的头，是名词；principle 是「道理」，永远抽象。',
              scene: ' imagine一个学校门口：站着的那位校长是 principal；墙上刻着「校训」的那句道理是 principle——一个是能叫出名字的人，一个是句格言。',
              mnemonic: 'principal 校长是个人，\nprinciple 原则句句真',
              analogy:
                '像「主演和剧本主旨」：principal 是那个扛票房的主要演员（也可指本金这个主要数字），principle 是剧本想说的道理。' +
                '一个人可以被换掉，道理换不掉。' +
                '失效点：principal 从来不表示「原则」，写作里把 principle 写成 principal 属于用词错误，不是风格差异。',
              exam: '真题高频：the principle of … 的搭配用 principle；principal 一词在阅读里多指校长或本金。'
            }
          },
          {
            title: 'bring / take / carry 辨析',
            index: 'bring',
            content:
              '三个「带」的三分法，是四级听力与阅读双高频。' +
              'bring 是「带过来」，方向朝说话人/听者（Bring your book here）；' +
              'take 是「带过去」，方向离说话人（Take the book to the office）；' +
              'carry 是「扛、运」，只强调运输本身，不预设方向（carry a heavy box）。' +
              '派生短语要一起记：bring up 抚养（孩子）；take up 占用时间、开始从事；' +
              'carry out 执行、落实（政策）。此外固定结构 differ from（不同于）、' +
              'prefer A to B（比起 B 更喜欢 A）也属同一类方向考点。',
            keywords: ['bring', 'take', 'carry', '方向', 'bring up', 'take up', 'carry out'],
            aids: {
              core: 'bring 带过来（朝我）｜ take 带过去（离我）｜ carry 扛着走（不预设方向）。',
              chain: 'bring（带来）→ bring up 抚养 → take（带去）→ take up 占用 → carry（搬运）→ carry out 执行',
              structure: '①三词同框②方向三分③搭配三组 ④派生短语⑤对比结构一则',
              contrast:
                'bring（方向朝听者）vs take（方向离开说话者）vs carry（只写运输）：' +
                'Bring the report to me 拿来 ✔（到我这）／ Take the report to the office 拿去 ✔（去那）／ carry the box 扛着箱子 ✔。',
              qa: '问：为什么不能说 take it here？答：take 是「带去那边」，方向与 here 冲突；要说「拿到这儿来」必须用 bring。',
              scene: ' imagine你在家：妈妈说 Bring your cup here（端过来），爸爸说 Take the cup to the sink（端过去），而你只描述动作本身时说 I carried ten cups（一次扛十个）。',
              mnemonic: 'bring 向我来，take 向他去，\ncarry 只管扛和运',
              analogy:
                '像「快递单上的两个箭头」：bring 是收件地址写你家，take 是寄件地址写你家，carry 是「已揽收」的状态——货在你手上，但还没决定往哪送。' +
                '所以 carry 最中立。' +
                '失效点：brought 与 taken 是不规则变化，不能写成 bringed 或 taked，这是四级写作最常错的一处。',
              exam: '听力里 bring/take 互换设选项极多；作文常考 take up（占用）与 carry out（执行）的搭配。'
            }
          }
        ]
      },
      {
        title: '第 7 组 · 学术与考试高频词（阅读题干里最常出现的一批）',
        points: [
          {
            title: 'hypothesis',
            index: 'hypothesis',
            content:
              'hypothesis n. 假设，假说（复数 hypotheses，读音「hypotheses」）。' +
              '词根 hypo-(在……之下) + thesis(命题、放置)，字面「放在下面的命题」，' +
              '即「尚未成立的命题，供后面检验」。常考搭配 a working hypothesis 一个工作假设；' +
              'test/put forward a hypothesis 检验/提出假设；' +
              'the hypothesis that 从句。易混点：hypothesis 是「待检验的假设」；' +
              'assumption 是「假定的前提」，不必真去检验；theory 是「已被反复验证的学说」，程度远高于 hypothesis。',
            keywords: ['hypothesis', '假设', 'hypotheses', 'hypo-', 'thesis', '命题', 'theory'],
            aids: {
              core: 'hypothesis＝待检验的假设，hypo-(在…下) + thesis(命题)。复数 hypotheses。',
              chain: 'thesis(命题) → hypothesis 假设 → hypothesis n. 前提 → synthesize综合',
              structure: '①词性 n. ②释义③词根 hypo-+thesis ④搭配三组 ⑤与 assumption/theory 辨析',
              contrast:
                'hypothesis（待验证的）vs theory（已验证成体系）vs assumption（默认前提不必验证）：' +
                'The data support the hypothesis 数据支持该假设 ✔，in the assumption that 在……这一前提下 ✔。',
              qa: '问：hypothesis 的复数怎么写？答：hypotheses，读作「haɪˈpɒθiːsiːz」，这是四级词汇里最常错的复数之一。',
              scene: ' imagine科学家的桌上摆着一张卡片，写着「也许这个药有效」，旁边是还没做的实验——假设就挂在那儿，等实验来把它推翻或扶正。',
              mnemonic: 'hypo 在下thesis 命题：\n先摆着，等人验',
              analogy:
                '像「还没修完的脚手架」：脚手架撑着房子但自己不是房子，hypothesis 就是这种「临时的、等着被检验的支撑」；theory 是房子本身，assumption 是图纸上的假设。' +
                '失效点：假设被推翻不等于工作失败，科学靠推翻假设前进，别把 hypothesis 当成需要维护的立场。',
              exam: '阅读题干里的 hypothesis 常配 support / confirm / reject；作文写可先用 In this hypothesis 引入研究假设。'
            }
          },
          {
            title: 'methodology',
            index: 'methodology',
            content:
              'methodology n. 方法论（研究方法的整体体系），研究方法。' +
              '词根 method(方法) + -ology(学说、学科)，字面「关于方法这门学问」。' +
              '常考搭配 research methodology 研究方法；' +
              'the methodology of the study 该研究的方法论；' +
              'a rigorous methodology 严谨的方法。易混点：methodology 不等于 method，' +
              'method 是「某一个做法」（访谈法、问卷法），methodology 是「整套研究设计与论证的体系」，' +
              '前者具体，后者抽象，一份论文可以有好几种 method，但只有一套 methodology。',
            keywords: ['methodology', '方法论', 'method', '-ology', '研究方法', 'rigorous'],
            aids: {
              core: 'methodology＝整套研究方法体系，method(方法) + -ology(学问)。',
              chain: 'method(方法) → methodology 方法论 → biology 生物学 → -ology 一类学问的后缀',
              structure: '①词性 n. ②释义③词根 method+-ology ④搭配三组 ⑤与 method 辨析',
              contrast:
                'method（一个具体做法）vs methodology（整套体系）：' +
                'The survey was the method 这项调查是方法本身 ✔，The survey was the methodology 这项调查构成了整套方法论 ✔。粒度完全不同。',
              qa: '问：-logy 是什么后缀？答：表示「……学」，如 biology 生物学、psychology 心理学、sociology 社会学，三者都是 -logy 家族。',
              scene: ' imagine你要拍一部纪录片：method 是你想用的那几台具体机器（航拍、特写），methodology 是整套拍法方案（为什么这样拍、怎么保证真实）。',
              mnemonic: 'method 方法 + ology 学问：\n方法成体系，才叫论',
              analogy:
                '像「厨艺和菜谱体系」：method 是「这道菜先炒还是先炖」，methodology 是整桌菜的搭配逻辑、刀工火候的整套规矩。' +
                '会做一道菜不等于有厨艺体系。' +
                '失效点：methodology 在论文里讲的是设计与论证的严谨性，不等于「方法越多越好」，一堆杂乱方法反而是缺陷。',
              exam: '学术类阅读题干高频词；读研/论文写作常用 The study adopts a quantitative methodology 这类表达。'
            }
          },
          {
            title: 'correlation',
            index: 'correlation',
            content:
              'correlation n. 相关性（复数 correlations）。词根 corre(共同、互相) + relation(关系)，' +
              '即「彼此之间的关联」。常考搭配 a correlation between A and B A 与 B 之间的相关性；' +
              'a strong/weak correlation 强/弱相关；positive/negative correlation 正/负相关；' +
              'correlate with 与……相关（动词）。' +
              '易混点：correlation 只是「一起变动」，不等于 causation（因果）；' +
              '而 causation 是「一个导致了另一个」。这是科学素养类阅读最常考的一组概念区分。',
            keywords: ['correlation', '相关性', 'correlate', '因果', 'causation', 'correlation'],
            aids: {
              core: 'correlation＝相关（一起变），≠ causation（因果）。注意 r 不发音，别漏读。',
              chain: 'corre(共同) → correlate 相关 → correlation 相关性 → correspond 符合（cor 共有）',
              structure: '①词性 n. ②释义③词根 corre+relation ④搭配三组 ⑤与 causation 辨析',
              contrast:
                'correlation（相关，一起变动）vs causation（因果，A 引起 B）：' +
                'a strong correlation between the two 两个变量强相关 ✔，there is no causal link 并无因果联系 ✔。相关先于因果，但远不等于因果。',
              qa: '问：correlation 里r 读什么？答：不发音，读作「kəˈreɪʃən」，开头是 k 不是 r，这是口语里最常露馅的一处。',
              scene: ' imagine两个仪表的曲线：气温一升，冰淇淋销量就跟着涨——它们同起同落，这是 correlation。要说「气温升高导致销量涨」，你还得再证明中间那一环。',
              mnemonic: 'corre 共同 + lation 关系：\n一起动，不等于谁动谁',
              analogy:
                '像「两台机器接在同一根电线上」：一台转速变了另一台跟着变，说明它们相关（correlation）；但要断定哪台带动了哪台，得查接线（causation）。' +
                '失效点：见到相关就写因果，是学术写作与四六级作文共有的逻辑错误。',
              exam: '阅读中 correlation 常配 causation 出现，答案往往落在「相关不等于因果」的提醒句上。'
            }
          },
          {
            title: 'data',
            index: 'data',
            content:
              'data n. 数据（复数，形式同复数；但严格语法上 datum 是单数）。' +
              '词源拉丁语 datum「给出的东西」，字面「被交付的事实」。' +
              '常考搭配 collect/gather data 收集数据；data analysis 数据分析；' +
              'data on/about 关于……的数据；raw data 原始数据；' +
              'these data are not conclusive 这些数据并不具决定性。' +
              '易混点：data 与 information 不同，data 是原始收集来的数字与记录，' +
              'information 是处理之后得到的资讯；data 与 statistics 也不同，' +
              'statistics 是经过统计分析之后的结果。',
            keywords: ['data', '数据', 'datum', '收集数据', 'raw data', 'data analysis'],
            aids: {
              core: 'data＝数据（复数），源自datum「被给出的东西」，收集来的原始记录。',
              chain: 'dat(给) → data 数据 → database 数据库（data + base）→ date 日期（同一词根，另一义）',
              structure: '①词性 n. ②释义③词源 datum ④搭配三组 ⑤与 information/statistics 辨析',
              contrast:
                'data（收集来的原始记录）vs statistics（分析后的统计结果）vs information（处理后的信息）：' +
                'raw data 原始数据 ✔，the statistics are alarming 统计结果令人担忧 ✔。前者是输入，中间是加工。',
              qa: '问：data 是可数还是不可数？答：现代英语中通常当复数（these data），但也可作不可数用（a lot of data），考试里两种都算对，别在这种细节上纠结。',
              scene: ' imagine做实验：你先把传感器读数一条条存进表格，那是 data；跑完统计画出那条曲线，那是 statistics；最后写「吸烟年限影响患病率」，那是 information。',
              mnemonic: 'dat给 + a：\n人家给的，就是数据',
              analogy:
                '像「菜市场的进货单」：data 是那一筐原料和数量，statistics 是算出的成本占比，information 是你据此决定今天进什么货。' +
                '链条是原料→加工→结论。' +
                '失效点：数据多不等于结论对，data 只保证你「量到了」，不保证「量对了」，这跟 correlation 那条同理。',
              exam: 'data analysis、collect data 是阅读题干高频；口语里 people often say data is，但写作用 these data are 更正式。'
            }
          },
          {
            title: 'phenomenon',
            index: 'phenomenon',
            content:
              'phenomenon n. 现象（复数 phenomena，读音「fəˈnɒmɪnə」）。' +
              '词根 pheno(显现) + -menon(显现物)，字面「显现出来的东西」，' +
              '源自希腊语 phainesthai「显现」。常考搭配 a natural phenomenon 自然现象；' +
              'a common phenomenon 普遍现象；' +
              'an observed phenomenon 被观察到的现象；' +
              'social phenomena 社会现象。' +
              '易混点：phenomenon 强调「可以被观察到的现象」，不解释原因；' +
              '而 theory 解释原因。论文标题里的 the phenomenon of ... 后面接的通常就是研究对象。',
            keywords: ['phenomenon', '现象', 'phenomena', 'pheno', '显现', '自然现象', 'theory'],
            aids: {
              core: 'phenomenon＝现象（复数 phenomena），pheno(显现)＋ -menon（显现物）。',
              chain: 'pheno(显现) → phenomenon 现象 → phenomenology 现象学 → phenomenon 名词是描述，不是解释',
              structure: '①词性 n. ②释义③词根 pheno+-menon ④搭配三组 ⑤复数特殊形式',
              contrast:
                'phenomenon（观察到的事实，不解释）vs theory（解释事实的学说）：' +
                'The phenomenon was observed in labs 该现象在实验室被观察到 ✔，The theory explains it 该理论解释它 ✔。层次不同。',
              qa: '问：phenomena 是单数还是复数？答：复数，读「fəˈnɒmɪnə」，注意是 nə 结尾；单数读「fəˈnɒmɪnən」，重音都在中间的 no。',
              scene: ' imagine你站在实验室里记录水里气泡的产生过程：你看到了一件事，把它写下来就是现象；但气泡为什么会出现，那要靠 theory 来解释。',
              mnemonic: 'phenomenon 现象，\n复数 phenomena 换名',
              analogy:
                '像「火灾调查」：现象（phenomenon）是「墙黑了、窗户碎了」这些被看见的痕迹；理论（theory）是「为什么是电线短路」的分析。' +
                '先记录，后解释。' +
                '失效点：describe the phenomenon 不等于 explain the phenomenon，作文里把两者混写会被判为逻辑不清。',
              exam: 'phenomena 拼写错误率高；议论文常用 the phenomenon of ... 引出社会现象这一主题句。'
            }
          },
          {
            title: 'criteria',
            index: 'criteria',
            content:
              'criterion n. 标准，准则（复数 criteria，读音「kraɪˈtɪəriə」）。' +
              '词源希腊语 kritērion「评判用的工具」，字面「用来下判断的东西」。' +
              '常考搭配 evaluation criteria 评价标准；' +
              'selection criteria 选拔标准；meet/satisfy the criteria 符合标准；' +
              'criteria for assessment 评估标准。' +
              '易混点：criterion 是「衡量用的尺度」，单数；' +
              'condition 是「条件、状况」，中文都译「条件」，但 criteria 是评估维度，conditions 是前提。' +
              'criteria 本身已是复数，不能再加 s。',
            keywords: ['criteria', 'criterion', '标准', '准则', '复数', 'evaluation criteria'],
            aids: {
              core: 'criterion＝衡量标准（复数 criteria，结尾 -na 不加 s）。词根 krit ＝判断。',
              chain: 'crit(判断) → criterion 标准 → critical 批判的 → criticize 批评 → critique 评析',
              structure: '①词性 n. ②释义③词根 krit+-erion ④搭配三组 ⑤与 condition 辨析',
              contrast:
                'criteria（衡量用的评估维度）vs conditions（前提、状况）：' +
                'the selection criteria 选拔标准 ✔，under these conditions 在这些条件下 ✔。一个管「怎么评」，一个管「在什么前提」。',
              qa: '问：criteria 后面能加 s 吗？答：不能，它已是复数；写 criterias 是四级写作的典型错误。',
              scene: ' imagine老师批考卷，手里那把尺子就是 criterion——它是用来量分数的尺子本身；而 conditions 是考试必须在教室里进行这个前提。',
              mnemonic: 'criterion 单数一把尺，\ncriteria 复数 plural是',
              analogy:
                '像「招聘的评分表」：criteria 是表上的几项（学历、经验、笔试分），是刻度本身；conditions 是「必须在周末面试」这类前提。' +
                '换一套 criteria，评价结果就变了。' +
                '失效点：criteria 定的是尺度，不保证谁达标；同一批人在两套 criteria 下排名可以完全颠倒。',
              exam: 'criteria 用作复数是固定考点；作文写evaluate by clear criteria 比随便评价更学术。'
            }
          },
          {
            title: 'hypothesis / assumption / theory 辨析',
            index: 'assumption',
            content:
              '本条把三个「理论性名词」放在一起，把四级最常混的一组彻底分开。' +
              'assumption 是「默认前提」——说话人不必证明它，只是先这么设着；' +
              'hypothesis 是「待检验的假设」——它的存在意义就是等着被数据推翻；' +
              'theory 是「已反复验证的学说」——是知识体系的一部分。' +
              '例：on the assumption that 基于……这一前提；' +
              'the hypothesis was rejected 假设被否定；' +
              'Darwin\'s theory of evolution 达尔文的进化论。' +
              '程度阶梯是：assumption → hypothesis → theory，越往后证据要求越高。',
            keywords: ['assumption', 'hypothesis', 'theory', '前提', '假设', '学说', '程度'],
            aids: {
              core: 'assumption＝默认设着的前提｜ hypothesis＝等着被检验｜ theory＝已被反复验证',
              chain: 'assum(拿、设) → assumption 前提 → hypothesis 待验 → theory 学说 → theorize 理论化',
              structure: '①三词并置②程度阶梯③搭配三组 ④一词一例句⑤判定方法',
              contrast:
                'assumption（不必验证的前提）vs hypothesis（必须被验证）vs theory（已被验证成体系）：' +
                'on the assumption that 基于……前提 ✔，test the hypothesis 检验假设 ✔，a well-established theory 公认理论 ✔。',
              qa: '问：为什么假设被推翻不等于研究失败？答：科学进步就靠排除错误假设，所以 hypothesis 从设计上就是可被推翻的。',
              scene: ' imagine三种东西：抽屉里随手写的猜测（assumption）、贴在墙上等着实验验证的猜想（hypothesis）、以及写进教科书并站住了的结论（theory）。位置和证据量都不同。',
              mnemonic: 'assumption 先假设，\nhypothesis 待检验，\ntheory 已成说',
              analogy:
                '像「探路的三步」：先假定那条路能走（assumption），再派人走一趟看通不通（hypothesis），反复走通之后才修成公路（theory）。' +
                '证据量是唯一的升级标准。' +
                '失效点：现实中三者常被混着用，说「assumption」时作者可能真在讲理论，说「theory」时可能只是猜想，别过度咬文嚼字。',
              exam: '学术阅读最常考；题干里出现 theorize 就说明还在建模阶段，出现 established 就说明已定型。'
            }
          }
        ]
      },
      {
        title: '第 8 组 · 主题与话题词（读懂长句的钥匙）',
        points: [
          {
            title: 'environment',
            index: 'environment',
            content:
              'environment n. 环境；周围状况。词根 environ(围绕) + -ment(名词后缀)，' +
              '字面「把……围起来的东西」，即围绕在你四周的一切。常考搭配 natural environment 自然环境；' +
              'a healthy environment 健康的成长环境；' +
              'protect/preserve the environment 保护环境；' +
              'environmental protection 环境保护。易混点：environment 是「你周围的一切」，' +
              'conditions 是「具体某一种状况」，所以 environmental problems 指广义的环境问题，' +
              '而 working conditions 指工作条件这一项，方向完全不同。',
            keywords: ['environment', '环境', 'environ', '围绕', 'environmental', 'conditions'],
            aids: {
              core: 'environment＝环境，environ(围绕) + -ment，「把四面围起来的一切」。',
              chain: 'environ(围绕) → environment 环境 → environmental 环境的 → environ 环绕',
              structure: '①词性 n. ②释义③词根 environ+-ment ④搭配三组 ⑤与 conditions 辨析',
              contrast:
                'environment（你周围的一切，宏观）vs conditions（某一项具体状况）：' +
                'a polluted environment 污染的环境 ✔，working conditions 工作条件 ✔。前者包罗，后者单一。',
              qa: '问：environment 的形容词是什么？答：environmental（只作定语用，environmental protection 环境保护），形容词用带 -al 的 environmental 而不是environed。',
              scene: ' imagine你搬进新宿舍那天：空气、噪声、室友、楼下吵不吵、窗帘遮不遮光——这一整套都叫 environment，而不是单指其中一样 conditions。',
              mnemonic: 'environ 围绕 + ment：\n四面围起来，环境',
              analogy:
                '像「鱼缸里的整套生态」：environment 是整缸水、砂、灯、温度、气流；conditions 只是「水温 26 度」这一项。' +
                '环境的坏往往是多项同时出问题。' +
                '失效点：environment 不等于 nature，自然环境只占它的一部分，社会环境、人际环境同样属于它。',
              exam: 'environmental protection / climate change 类搭配是阅读与作文双高频；注意不要把 environmental 用成副词。'
            }
          },
          {
            title: 'technology',
            index: 'technology',
            content:
              'technology n. 技术，科技（不可数）。词根 techn(技艺) + -logy(学问) + -ology，' +
              '字面「关于技艺的学问」，希腊语 tekhnē「技艺、手艺」。' +
              '常考搭配 advanced technology 先进技术；' +
              'information technology 信息技术；' +
              'technological advancement 技术进步；' +
              'technologically advanced 技术先进的。易混点：technology 是不可数名词，' +
              '不说 technologies 当「技术总称」；technic(al) 是形容词；' +
              'technique 是「具体技巧」，一个技术体系里包含很多 technique（手法、诀窍）。',
            keywords: ['technology', '技术', '不可数', 'techno', 'technological', 'technique', 'advanced'],
            aids: {
              core: 'technology＝技术（不可数），techn(技艺) + -logy(学问)；technique＝具体手法。',
              chain: 'techn(技艺) → technology 技术 → technique 手法 → technologist 技术专家 → technician 技师',
              structure: '①词性 n. ②释义③词根 techno ④搭配三组 ⑤与 technique 辨析',
              contrast:
                'technology（技术总称）vs technique（具体手法）：' +
                'modern technology 现代技术 ✔，a useful technique 有用的手法 ✔。前者是体系，后者是单招。',
              qa: '问：technology 能加 s 吗？答：一般不取复数表「技术总称」；表「某项具体技术」时才用 technologies。',
              scene: ' imagine你学做菜：technology 是整个料理学，technique 是「爆香时要先下姜」这种单点诀窍。有了学理，还需要诀窍才做得出。',
              mnemonic: 'techno 技艺 + logy 学问：\n技术的学问，不是单招',
              analogy:
                '像「剑术与其中的一式」：technology 是完整武学体系，technique 是其中「刺」这一招。学会一招不等于练成整套武学。' +
                '失效点：technology 是不可数的，说 a technology 不合习惯用法，除非指某一项独立技术。',
              exam: 'information technology (IT) 是阅读高频；注意不要把 technology 当成可数名词写 a technology。'
            }
          },
          {
            title: 'education',
            index: 'education',
            content:
              'education n. 教育（不可数）。词根 e-(出) + duc(引导) + -ation，' +
              '字面「把人的潜在能力引导出来」。常考搭配 higher education 高等教育；' +
              'compulsory education 义务教育；' +
              'adult education 成人教育；' +
              'educational background 教育背景；' +
              'a strong educational system 完善的教育体系。易混点：education 是不可数名词，' +
              '谈教育这一整套制度；training 是「具体的培训」，所以 teacher training 是教师培训，' +
              '不是「教师的教育」。',
            keywords: ['education', '教育', '不可数', 'edu', 'duc', '引导', 'training'],
            aids: {
              core: 'education＝教育（不可数），e-(出) + duc(引导)，「把潜能引出来」。',
              chain: 'duc(引导) → education 教育 → educate 教导 → educator 教育工作者 → educe 引出',
              structure: '①词性 n. ②释义③词根 e-+duc ④搭配三组 ⑤与 training 辨析',
              contrast:
                'education（教育体系，不可数）vs training（具体培训）：' +
                'Higher education 高等教育 ✔，teacher training 教师培训 ✔。一个指制度，一个指项目。',
              qa: '问：educate 和 educate oneself 有什么区别？答：educate sb 教导某人；educate oneself 自我教育，自学；搭配不同但动词同一个。',
              scene: ' imagine一个孩子从幼儿园到大学的整个成长通道，那是 education；公司里那两周的 Excel 课，那是 training。',
              mnemonic: 'e 出 + duc 引导：\n把潜力引出来，叫教育',
              analogy:
                '像「一座水库与一次放水」：education 是水库本身（含坝、渠道、蓄水量的体系），training 是某次放水灌溉。' +
                '水库容得下多少次放水，取决于体系的大小。' +
                '失效点：education 不可数，所以要说 a well-educated person，不能说 an educated thing。',
              exam: 'higher/compulsory education 是必背搭配；教育类阅读里 educational 与 educated（受过教育的）常混设选项。'
            }
          },
          {
            title: 'economy',
            index: 'economy',
            content:
              'economy n. 经济；节约。词根 eco(管理、习俗) + -onomy(管理)，' +
              '字面「管理得好」，引申为「节省」。常考搭配 national economy 国民经济；' +
              'the global economy 全球经济；' +
              'economy class 经济舱（乘飞机）；' +
              'economy of scale 规模经济；' +
              'frugal economy 节俭型经济。易混点：economy 可表示「节约」（形容词为 economical），' +
              '注意搭配 be economical（形容词）而不是 economy；' +
              'economics 是「经济学」这门学科（不可数）。',
            keywords: ['economy', '经济', '节约', 'eco', 'economy class', 'economy of scale', 'economics'],
            aids: {
              core: 'economy＝经济/节约，eco(管理)+ -onomy；节省要用形容词 economical。',
              chain: 'eco(管理) → economy 经济 → economics 经济学 → economical 节俭的 → ecology 生态',
              structure: '①词性 n. ②两层释义③词根 eco ④搭配三组 ⑤与 economical/economics 辨析',
              contrast:
                'economy（经济，名词）vs economical（节约的，形容词）vs economics（经济学）：' +
                'save money as an economy measure 以节约的方式省钱 ✔，It is economical to cycle here 骑车来这里很省钱 ✔。',
              qa: '问：表示「节约」时用哪个词？答：直接用形容词 economical（be economical），名词 economy 更多用于「经济」这层意思。',
              scene: ' imagine你在看一份国家报表：GDP 是 economy；而看到「这家公司通过 redesign 节约了三成成本」，那个「节约」动作就用 economical 形容。',
              mnemonic: 'eco 管理 + onomy：\n管理得好，就省',
              analogy:
                '像「一个国家这台大机器」：economy 是这台机器的运行效率，economics 是研究这台机器的学问，economical 则是某一次操作省不省。' +
                '同一词根，三个层面。' +
                '失效点：economy of scale（规模经济）中的 economy 是「经济性」，不是「节约」，别照字面理解成越省越好。',
              exam: 'economy class、economy of scale 是听力与阅读常考；注意 economics 才是学科名且不可数。'
            }
          },
          {
            title: 'society',
            index: 'society',
            content:
              'society n. 社会；社团。词根 soci(同伴、同伴关系) + -ety(名词后缀)，' +
              '来自拉丁语 socius「同伴」，字面「一群人相处在一起」。' +
              '常考搭配 modern society 现代社会；' +
              'a democratic society 民主社会；' +
              'society depends on 社会依赖于；' +
              'the society 某个协会（社团义）。易混点：society 是「人与人的整体关系结构」；' +
              'community 是「有共同点的一群人」；social 是形容词（社会的）；' +
              'associate 是指某个具体关联，associate with 联想、交往。',
            keywords: ['society', '社会', 'soci', '同伴', 'social', 'community', 'associate'],
            aids: {
              core: 'society＝社会，soci(同伴) + -ety，「一群人相处在一起形成的结构」。',
              chain: 'soci(同伴) → society 社会 → social 社会的 → sociology 社会学 → associate 联想（a- + soci）',
              structure: '①词性 n. ②两层释义③词根 soci ④搭配三组 ⑤与 community/social 辨析',
              contrast:
                'society（整个社会，人与人之间的整体关系）vs community（有共同点的那个群体）：' +
                'society depends on mutual trust 社会依赖互信 ✔，the local community 当地社区 ✔。后者只是 society 的一部分。',
              qa: '问：society 和 social 怎么区分？答：society 是名词「社会」，social 是形容词「社会的」，如 social media 社交媒体、social problems 社会问题。',
              scene: ' imagine你搬进一座新城市：整座城市的人怎么分工、怎么相处、规则怎么定，那是 society；楼下棋牌室那帮每天一起下棋的人，是 community。',
              mnemonic: 'soci 同伴 + ety：\n人与人的关系网',
              analogy:
                '像「一张渔网」：society 是整张网，网点之间的关系决定能捞到什么；community 是网里一小块打结的地方。' +
                '摸网的手感就是社会，捏住某个结才谈得上社区。' +
                '失效点：society 不等于政府，也不等于制度，它是所有人互动的总和，包括家庭和邻里。',
              exam: 'social issues / social problems 是写作高频；sociology（社会学）是文学类阅读常见学科名。'
            }
          },
          {
            title: 'government',
            index: 'government',
            content:
              'government n. 政府；管理（不可数）。词根 govern(统治、支配) + -ment，' +
              '字面「行使统治这件事」，所以它既是机构也是「治理这一行为」。' +
              '常考搭配 local government 地方政府；' +
              'government agencies 政府机构；' +
              'a government agency 政府机构；' +
              'under the government 在政府统治下；' +
              'government funding 政府拨款。易混点：government 是「政府（机构或政策）」，' +
              'govern 是动词「统治、支配」，governing 是形容词「执政的」，' +
              'governance 是名词「治理方式」（good governance 良治）。',
            keywords: ['government', '政府', 'govern', '统治', 'local government', 'governance'],
            aids: {
              core: 'government＝政府/治理，govern(统治) + -ment。注意 govern 是动词、government 才是名词。',
              chain: 'govern(统治) → government 政府 → govern 统治（动词）→ governance 治理方式 → governor 州长',
              structure: '①词性 n. ②两层释义③词根 govern+-ment ④搭配三组 ⑤词族五词辨析',
              contrast:
                'government（政府这个机构）vs governance（治理方式）vs govern（统治这个动作）：' +
                'the local government 地方政府 ✔，good governance 良治 ✔，a country is governed by law 国家依法治理 ✔。',
              qa: '问：government 是可数还是不可数？答：谈机构时是可数（governments 指各国政府），谈「治理方式」时不可数。',
              scene: ' imagine你查一个政策是怎么来的：先看到 the government 这个机构，再看它怎么 govern（管），最后评价这套管法是不是 good governance（良治）。',
              mnemonic: 'govern 统治 + ment：\n统治这件事，就是政府',
              analogy:
                '像「足球教练与球队」：government 是球队这个机构，govern 是教练的指挥动作，governance 是这整套打法好不好、值不值得学。' +
                '同一件事的三个切面。' +
                '失效点：government 只指官方机构，不等于 ruling party（在执政的党），也不等于 society。',
              exam: 'local government / government policy 是阅读高频；governance 多见于政论与学术文本。'
            }
          }
        ]
      }
    ]
  }
];
