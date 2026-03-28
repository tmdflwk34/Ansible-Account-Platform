import { useState } from "react";
import { motion } from "framer-motion";

export default function SSOTest() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [username, setUsername] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [projectGroup, setProjectGroup] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [instanceIds, setInstanceIds] = useState('');

  const handleTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/provision-sso-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  const handleIntegratedProvisioning = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrated-provisioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username: username || undefined,
          region,
          project_group: projectGroup,
          target_account_id: targetAccountId,
          instance_ids: instanceIds.split(',').map(id => id.trim()).filter(id => id)
        })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">SSO 프로비저닝 테스트</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 입력" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">권한</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEmail('tester@example.com')} className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors">테스트 계정</button>
              <button onClick={() => setEmail('user21@example.com')} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">일반 계정</button>
            </div>
            <button onClick={handleTest} disabled={loading || !email} className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? 'SSO 계정 생성 중...' : 'SSO 계정 생성'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">통합 프로비저닝</h2>
          <p className="text-sm text-gray-600 mb-6">SSO 계정 생성 + Researcher 권한 부여 + 서버 계정 생성</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">서버 사용자명</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="자동 생성 (선택사항)" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">리전</label>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                  <option value="us-east-1">us-east-1 (버지니아)</option>
                  <option value="us-west-2">us-west-2 (오레곤)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">프로젝트 그룹 *</label>
              <input type="text" value={projectGroup} onChange={(e) => setProjectGroup(e.target.value)} placeholder="예: ai-team, devops-team" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AWS 계정 ID *</label>
              <input type="text" value={targetAccountId} onChange={(e) => setTargetAccountId(e.target.value)} placeholder="123456789012" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">인스턴스 ID *</label>
              <input type="text" value={instanceIds} onChange={(e) => setInstanceIds(e.target.value)} placeholder="i-1234567890abcdef0, i-0987654321fedcba0" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
              <p className="text-xs text-gray-500 mt-1">쉼표로 구분하여 여러 인스턴스 입력</p>
            </div>
            <button onClick={handleIntegratedProvisioning} disabled={loading || !email || !projectGroup || !targetAccountId || !instanceIds} className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? '통합 프로비저닝 중...' : '통합 프로비저닝 시작'}
            </button>
          </div>
        </div>

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-2xl ${result.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
            {result.success ? (
              <div className="text-green-800">
                <h3 className="font-semibold text-lg mb-3">✅ 프로비저닝 완료</h3>
                {result.sso ? (
                  <div className="space-y-3">
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">SSO 계정</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>User ID:</strong> {result.sso.user_id}</p>
                        <p><strong>사용자명:</strong> {result.sso.username}</p>
                        <p><strong>이메일:</strong> {result.sso.email}</p>
                        <p><strong>이메일 발송:</strong> {result.sso.email_sent ? '완료 (Mock)' : '실패'}</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Ansible 실행</h4>
                      <div className="text-sm">
                        <p><strong>상태:</strong> {result.ansible.status}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    <p><strong>사용자명:</strong> {result.username}</p>
                    <p><strong>표시명:</strong> {result.display_name}</p>
                    <p><strong>권한:</strong> {result.role}</p>
                    <p><strong>애플리케이션:</strong> {result.application}</p>
                    {result.real_creation && <p className="text-green-600">🎯 실제 AWS SSO 계정 생성됨</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-800">
                <h3 className="font-semibold mb-2">❌ 오류 발생</h3>
                <p className="text-sm">{result.error}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
