import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRightIcon, UserPlusIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { getRegions, getInstances } from "../api";

const ROLE_DETAILS = {
  user: {
    label: "User - 일반 사용자",
    sudoers: "# sudo 권한 없음"
  },
  ops: {
    label: "Ops - 운영 권한",
    sudoers: "# 시스템 모니터링, Docker, Slurm 관리 등"
  },
  admin: {
    label: "Admin - 전체 권한",
    sudoers: "%acme-admin ALL=(ALL) NOPASSWD: ALL"
  }
};

export default function Onboarding() {
  const [emailPrefix, setEmailPrefix] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const [username, setUsername] = useState("");
  const [uid, setUid] = useState("");
  const [gid, setGid] = useState("");
  const [role, setRole] = useState("user");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [ssoGroups, setSsoGroups] = useState([]);
  const [selectedSsoGroup, setSelectedSsoGroup] = useState("");
  const [predictedUidGid, setPredictedUidGid] = useState("");
  const [checkingUid, setCheckingUid] = useState(false);
  const [uidExists, setUidExists] = useState(null);
  const [regions, setRegions] = useState([]);
  const [regionInstances, setRegionInstances] = useState({});
  const [selectedInstances, setSelectedInstances] = useState({});
  const [expandedRegions, setExpandedRegions] = useState({});
  const [availableGroups, setAvailableGroups] = useState([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [usernameError, setUsernameError] = useState("");
  const [showRoleDetails, setShowRoleDetails] = useState(false);
  const [autoUidGid, setAutoUidGid] = useState(true);
  const [checkingUser, setCheckingUser] = useState(false);
  const [userExists, setUserExists] = useState(null);
  const [dryRun, setDryRun] = useState(false);

  const EMAIL_DOMAIN = "@acme.re.kr";
  
  const ALLOWED_INSTANCES = [
    'acme-or-p4d',
    'acme-or-p4de',
    'acme-or-g5',
    'acme-or-zonea-r7',
    'acme-or-p5',
    'headnod'
  ];
  
  const isInstanceAllowed = (instanceName) => {
    return ALLOWED_INSTANCES.some(allowed => instanceName.toLowerCase().includes(allowed.toLowerCase()));
  };

  useEffect(() => {
    const init = async () => {
      const regionList = await getRegions();
      setRegions(regionList);
      regionList.forEach(async (region) => {
        try {
          const inst = await getInstances(region);
          setRegionInstances(prev => ({ ...prev, [region]: inst }));
        } catch (error) {
          console.error("Failed:", error);
        }
      });
      
      // SSO Groups 조회
      try {
        const response = await fetch("/api/sso/groups");
        const data = await response.json();
        setSsoGroups(data.groups || []);
      } catch (error) {
        console.error("Failed to fetch SSO groups:", error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (Object.keys(selectedInstances).length > 0) {
      fetchAvailableGroups();
      fetchPredictedUidGid();
    }
  }, [selectedInstances]);

  const fetchPredictedUidGid = async () => {
    const firstRegion = Object.keys(selectedInstances)[0];
    const firstInstance = selectedInstances[firstRegion]?.[0];
    
    if (!firstRegion || !firstInstance) return;

    try {
      const response = await fetch("/api/provisioning/predict-uid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionInstances: selectedInstances })
      });
      const data = await response.json();
      setPredictedUidGid(data.predicted_uid || "");
    } catch (error) {
      console.error("Failed to fetch predicted UID:", error);
    }
  };

  useEffect(() => {
    if (username && !usernameError) {
      const timer = setTimeout(() => {
        checkUserExists();
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setUserExists(null);
    }
  }, [username, selectedInstances]);

  useEffect(() => {
    if (!autoUidGid && uid) {
      const timer = setTimeout(() => { checkUidExists(); }, 800);
      return () => clearTimeout(timer);
    } else {
      setUidExists(null);
    }
  }, [uid, autoUidGid]);

  const fetchAvailableGroups = async () => {
    const firstRegion = Object.keys(selectedInstances)[0];
    const firstInstance = selectedInstances[firstRegion]?.[0];
    
    if (!firstRegion || !firstInstance) return;

    try {
      const response = await fetch("/api/project-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: firstRegion, instanceId: firstInstance })
      });
      const data = await response.json();
      setAvailableGroups(data.groups || []);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  };

  const checkUserExists = async () => {
    if (!username) return;
    
    setCheckingUser(true);
    try {
      const response = await fetch("/api/provisioning/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, regionInstances: selectedInstances })
      });
      const data = await response.json();
      setUserExists(data.exists ? data.exists_on : null);
    } catch (error) {
      console.error("Failed to check user:", error);
      setUserExists(null);
    } finally {
      setCheckingUser(false);
    }
  };

  const checkUidExists = async () => {
    if (!uid) return;
    setCheckingUid(true);
    try {
      const response = await fetch("/api/provisioning/check-uid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: parseInt(uid) })
      });
      const data = await response.json();
      setUidExists(data.exists ? data.exists_on : null);
    } catch (error) {
      setUidExists(null);
    } finally {
      setCheckingUid(false);
    }
  };

  const checkEmailExists = async (email) => {
    try {
      const response = await fetch("/api/provisioning/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      setEmailExists(data.exists);
    } catch (error) {
      console.error("Failed to check email:", error);
      setEmailExists(false);
    }
  };

  const validateEmailPrefix = (value) => {
    if (!value) return "";
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(value)) return "이메일에 한글을 사용할 수 없습니다.";
    if (/^\d/.test(value)) return "이메일은 숫자로 시작할 수 없습니다.";
    if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(value)) return "올바른 이메일 형식이 아닙니다.";
    return "";
  };

  const validateUsername = (value) => {
    if (!value) return "";
    if (value.length < 3) return "사용자명은 3자 이상이어야 합니다.";
    if (!/^[a-z][a-z0-9_-]*$/.test(value)) return "사용자명은 소문자로 시작하고 소문자, 숫자, -, _만 사용 가능합니다.";
    return "";
  };

  const handleEmailPrefixChange = (e) => {
    const value = e.target.value;
    setEmailPrefix(value);
    setEmailError(validateEmailPrefix(value));
    setEmailExists(false);
    
    // 이메일 중복 체크
    if (value && validateEmailPrefix(value) === "") {
      checkEmailExists(value + "@acme.re.kr");
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    setUsernameError(validateUsername(value));
  };

  const toggleRegion = (region) => {
    setExpandedRegions(prev => ({ ...prev, [region]: !prev[region] }));
  };

  const toggleInstance = (region, instanceId) => {
    console.log('toggleInstance called:', { region, instanceId });
    setSelectedInstances(prev => {
      console.log('Previous state:', prev);
      const regionSelected = prev[region] || [];
      const newRegionSelected = regionSelected.includes(instanceId)
        ? regionSelected.filter(id => id !== instanceId)
        : [...regionSelected, instanceId];
      if (newRegionSelected.length === 0) {
        const { [region]: _, ...rest } = prev;
        console.log('Removing region, new state:', rest);
        return rest;
      }
      const newState = { ...prev, [region]: newRegionSelected };
      console.log('New state:', newState);
      return newState;
    });
  };

  const selectAllInRegion = (region) => {
    const allowedInstances = regionInstances[region]?.filter(inst => isInstanceAllowed(inst.name)) || [];
    const allowedIds = allowedInstances.map(inst => inst.instanceId);
    
    setSelectedInstances(prev => {
      const currentSelected = prev[region] || [];
      const allSelected = allowedIds.every(id => currentSelected.includes(id));
      
      if (allSelected) {
        // 전체 해제
        const { [region]: _, ...rest } = prev;
        return rest;
      } else {
        // 전체 선택
        return { ...prev, [region]: allowedIds };
      }
    });
  };

  const toggleGroup = (groupName) => {
    setSelectedGroups(prev =>
      prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]
    );
  };

  const toggleSsoGroup = (groupId) => {
    setSelectedSsoGroup(prev => prev === groupId ? "" : groupId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const emailErr = validateEmailPrefix(emailPrefix);
    const userErr = validateUsername(username);
    
    if (emailErr || userErr) {
      setEmailError(emailErr);
      setUsernameError(userErr);
      return;
    }

    if (emailExists) {
      alert(`이메일 "${emailPrefix}${EMAIL_DOMAIN}"이(가) 이미 IAM Identity Center에 등록되어 있습니다.`);
      return;
    }

    if (userExists && userExists.length > 0) {
      alert(`사용자명 "${username}"은(는) 서버에 이미 존재합니다.`);
      return;
    }

    const totalSelected = Object.values(selectedInstances).flat().length;
    if (totalSelected === 0) {
      alert("최소 1개 이상의 인스턴스를 선택해주세요.");
      return;
    }

    if (false) {
      alert("최소 1개 이상의 프로젝트 그룹을 선택해주세요.");
      return;
    }
    
    const fullEmail = emailPrefix + EMAIL_DOMAIN;
    
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/provisioning/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fullEmail,
          username,
          uid: autoUidGid ? null : uid,
          gid: autoUidGid ? null : gid,
          role,
          groups: selectedGroups,
          ssoGroups: selectedSsoGroup ? [selectedSsoGroup] : [],
          regionInstances: selectedInstances,
          dryRun: dryRun
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({ success: true, data });
      } else {
        setResult({ success: false, error: data.error || "작업 실행 중 오류가 발생했습니다." });
      }
    } catch (error) {
      setResult({ success: false, error: "서버 연결 실패" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <span className="font-medium text-blue-600">통합 프로비저닝</span>
        <ChevronRightIcon className="w-4 h-4" />
        <span>사용자 등록</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-100 rounded-xl">
              <UserPlusIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">통합 프로비저닝</h1>
              <p className="text-gray-500 mt-1">사용자 정보, 권한, 서버 접근 설정을 한 번에 구성합니다</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">이메일 주소</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={emailPrefix}
                  onChange={handleEmailPrefixChange}
                  placeholder="username"
                  required
                  className={`flex-1 px-4 py-3 border-2 rounded-xl transition-all ${
                    emailError || emailExists ? "border-red-300 focus:ring-2 focus:ring-red-500" : "border-gray-200 focus:ring-2 focus:ring-blue-500"
                  }`}
                />
                <span className="text-gray-600 font-medium">{EMAIL_DOMAIN}</span>
              </div>
              {emailError && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                  <p className="text-xs text-yellow-800">{emailError}</p>
                </motion.div>
              )}
              {emailExists && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                  <p className="text-xs text-red-800">이미 IAM Identity Center에 등록된 이메일입니다</p>
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  서버 사용자명 <span className="text-xs text-gray-500">(예: admin → admin)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    placeholder="server_username"
                    required
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
                      usernameError ? "border-red-300 focus:ring-2 focus:ring-red-500" : 
                      userExists ? "border-red-400 focus:ring-2 focus:ring-red-500" :
                      "border-gray-200 focus:ring-2 focus:ring-blue-500"
                    }`}
                  />
                  {checkingUser && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  )}
                </div>
                {usernameError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs text-yellow-800">{usernameError}</p>
                  </motion.div>
                )}
                {!usernameError && userExists && userExists.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-2 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2">
                    <XCircleIcon className="w-4 h-4 text-red-600" />
                    <p className="text-xs font-semibold text-red-800">서버에 이미 존재하는 사용자명입니다.</p>
                  </motion.div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">권한 설정</label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {Object.entries(ROLE_DETAILS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowRoleDetails(!showRoleDetails)}
                    className="absolute right-12 top-1/2 -translate-y-1/2 text-blue-600 text-xs hover:underline"
                  >
                    상세
                  </button>
                </div>
                {showRoleDetails && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">{ROLE_DETAILS[role].sudoers}</pre>
                  </motion.div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="autoUidGid"
                  checked={autoUidGid}
                  onChange={(e) => setAutoUidGid(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="autoUidGid" className="text-sm font-semibold text-gray-700">
                  UID/GID 자동 할당 (최종 사용자 +1)
                  
                </label>
              </div>
              {!autoUidGid && (
                <div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">UID</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={uid}
                          onChange={(e) => { setUid(e.target.value); setGid(e.target.value); }}
                          placeholder="1027"
                          className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${uidExists ? "border-red-300" : "border-gray-200"} focus:ring-2 focus:ring-blue-500`}
                        />
                        {checkingUid && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">GID</label>
                      <input
                        type="number"
                        value={gid}
                        onChange={(e) => setGid(e.target.value)}
                        placeholder="1027"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  {uidExists && uidExists.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-2 bg-red-50 border border-red-300 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircleIcon className="w-4 h-4 text-red-600" />
                        <p className="text-xs font-semibold text-red-800">UID {uid}이(가) 이미 사용 중입니다 ({uidExists.join(", ")})</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">서버 선택</label>
              <div className="space-y-2 max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-4">
                {regions.map(region => {
                  const allowedCount = regionInstances[region]?.filter(inst => isInstanceAllowed(inst.name)).length || 0;
                  const selectedCount = selectedInstances[region]?.length || 0;
                  const allSelected = allowedCount > 0 && selectedCount === allowedCount;
                  
                  return (
                    <div key={region}>
                      <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all">
                        <button
                          type="button"
                          onClick={() => toggleRegion(region)}
                          className="flex-1 flex items-center justify-between"
                        >
                          <span className="font-semibold text-gray-700">{region}</span>
                          <ChevronDownIcon className={`w-5 h-5 transition-transform ${expandedRegions[region] ? "rotate-180" : ""}`} />
                        </button>
                        {allowedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => selectAllInRegion(region)}
                            className="ml-2 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-all"
                          >
                            {allSelected ? "전체 해제" : "전체 선택"}
                          </button>
                        )}
                      </div>
                      {expandedRegions[region] && regionInstances[region] && (
                        <div className="ml-4 mt-2 space-y-1">
                          {regionInstances[region].map(inst => {
                            const allowed = isInstanceAllowed(inst.name);
                            return (
                              <label 
                                key={inst.instanceId} 
                                className={`flex items-center gap-2 p-2 rounded ${
                                  allowed ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed bg-gray-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={allowed && (selectedInstances[region]?.includes(inst.instanceId) || false)}
                                  onChange={() => allowed && toggleInstance(region, inst.instanceId)}
                                  disabled={!allowed}
                                  className="w-4 h-4 text-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span className={`text-sm ${allowed ? 'text-gray-700' : 'text-gray-400'}`}>
                                  {inst.name}
                                  {!allowed && <span className="ml-2 text-xs text-red-500">(선택 불가)</span>}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {availableGroups.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  프로젝트 그룹
                </label>
                <input
                  type="text"
                  placeholder="그룹 검색..."
                  value={groupSearchTerm}
                  onChange={(e) => setGroupSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 mb-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-4">
                  {availableGroups
                    .filter(group => group.name.toLowerCase().includes(groupSearchTerm.toLowerCase()))
                    .map(group => (
                    <label key={group.name} className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.name)}
                        onChange={() => toggleGroup(group.name)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">{group.name}</span>
                        <span className="text-xs text-gray-500 ml-2">({group.memberCount}명)</span>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">그룹 미선택 시 그룹 없이 사용자가 생성됩니다. 배치 현황은 <a href="/server/project-groups" className="text-blue-600 underline">계정 프로젝트 권한</a> 페이지를 참고하세요.</p>
              </div>
            )}

            {ssoGroups.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  IAM Identity Center Groups (1개만 선택)
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto border-2 border-gray-200 rounded-xl p-4">
                  {ssoGroups.map(group => (
                    <label key={group.GroupId} className={`flex flex-col gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${selectedSsoGroup === group.GroupId ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-purple-50'}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="ssoGroup"
                          checked={selectedSsoGroup === group.GroupId}
                          onChange={() => toggleSsoGroup(group.GroupId)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span className="text-sm font-medium text-gray-700">{group.DisplayName}</span>
                      </div>
                      {group.PermissionSets && group.PermissionSets.length > 0 && (
                        <div className="ml-6 text-xs text-gray-600">
                          <span className="font-semibold">Permission Sets:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {group.PermissionSets.map((ps, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                {ps}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">사용자가 선택한 그룹에 추가되며, 그룹에 할당된 Permission Set이 자동으로 적용됩니다</p>
              </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4 text-yellow-600 rounded"
              />
              <label htmlFor="dryRun" className="text-sm font-semibold text-yellow-800">
                테스트 모드 (Dry Run) - 실제 생성하지 않고 실행될 명령어만 확인
              </label>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !!emailError || !!usernameError || (userExists && userExists.length > 0)}
              className={`w-full px-6 py-4 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl ${
                dryRun 
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              } disabled:from-gray-400 disabled:to-gray-500`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  처리 중...
                </span>
              ) : dryRun ? (
                "테스트 실행 (Dry Run)"
              ) : (
                "통합 프로비저닝 실행"
              )}
            </motion.button>
          </form>

          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`mt-6 p-6 rounded-xl border-2 ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-bold text-lg mb-2 ${result.success ? "text-green-800" : "text-red-800"}`}>
                    {result.success ? "작업 완료" : "작업 실패"}
                  </h3>
                  <pre className="text-sm whitespace-pre-wrap font-mono bg-white bg-opacity-50 p-4 rounded-lg overflow-auto max-h-96">
                    {result.success ? JSON.stringify(result.data, null, 2) : result.error}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
