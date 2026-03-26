┌──────────────────────────────────────────────────────────────────┐
│                       完整闭环工作流（v2）                         │
│                                                                  │
│  ⓪ 前置检查（踩坑新增）                                           │
│  ├── git remote -v → 确认远端名（origin? fork?）                  │
│  ├── ls .github/workflows/ → 确认 CI 存在                        │
│  └── 检查 repo ruleset → feature 分支不能被 "require PR" 保护     │
│                                                                  │
│  ① 分支 + 实现                                                   │
│  ├── git checkout -b feat/xxx                                    │
│  ├── 写代码                                                      │
│  ├── 写测试（Tip 34: TDD）                                       │
│  └── 本地跑测试 → 全部通过                                        │
│                                                                  │
│  ② 创建 Draft PR（Tip 4: 低风险沙箱）                             │
│  ├── git push -u $REMOTE <branch>                                │
│  │   └── 若 GH013 rejected → 调整 ruleset → 重试                 │
│  ├── gh pr create --draft --repo <owner>/<repo>                  │
│  └── PR 描述包含变更摘要 + 自检清单                                │
│                                                                  │
│  ③ CI 验证（Tip 17: 指数退避）                                    │
│  ├── gh run list → 确认 RUN_ID 非空                               │
│  │   └── 若为空 → 检查 workflow 触发规则（branches filter）        │
│  ├── 1min → 2min → 4min 轮询                                    │
│  └── CI 红 → gh run view --log-failed → 修复 → force push → ③   │
│                                                                  │
│  ④ AI 自审（Tip 28: 多维度验证）                                  │
│  ├── gh pr diff --repo → 逐文件审查                               │
│  ├── "double check everything, make a verification table"        │
│  ├── 检查：安全性 / 兼容性 / 边界情况 / 代码质量                    │
���  └── 发现问题 → 修复 → amend → force push → 回到 ③               │
│                                                                  │
│  ⑤ 交付                                                         │
│  ├── gh pr ready --repo（Draft → Ready for review）               │
│  └── 人工最终审批 → merge                                        │
│                                                                  │
│  ⑥ 清理（闭环新增）                                               │
│  ├── git checkout main && git pull                               │
│  ├── git branch -d <branch>                                      │
│  └── git push $REMOTE --delete <branch>                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
