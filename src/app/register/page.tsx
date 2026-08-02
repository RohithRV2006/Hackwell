'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { checkTeamNameUnique, registerTeamData, checkBatchNumbers, checkRegistrationTimelineStatus } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Select from 'react-select';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { HACKATHON_THEMES, ALL_PROBLEM_STATEMENTS } from '@/lib/data/themes';

const depts = ["AID", "CSBS", "CSE", "CSE(AIML)", "IT"] as const;
const years = ["II", "III", "IV"] as const;

const baseMemberSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  batchNumber: z.string().regex(/^\d{6}$/, 'Must be 6 digits'),
  department: z.enum(depts),
  year: z.enum(years),
  section: z.string().optional(),
});

const memberSuperRefine = (data: any, ctx: z.RefinementCtx) => {
  if (data.department === 'AID' || data.department === 'CSE') {
    if (data.section !== 'A' && data.section !== 'B') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Required (A or B)',
        path: ['section'],
      });
    }
  }
};

const leadSchema = baseMemberSchema.extend({
  email: z.string().email('Invalid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
  contactNumber: z.string().min(10, 'Valid contact number is required'),
}).superRefine((data, ctx) => {
  memberSuperRefine(data, ctx);
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['confirmPassword']
    });
  }
});

const memberSchema = baseMemberSchema.superRefine(memberSuperRefine);

const formSchema = z.object({
  teamName: z.string().min(3, 'Must be at least 3 characters'),
  theme: z.string().min(1, 'Please select a theme'),
  problemStatement: z.string().min(1, 'Please select a problem statement'),
  termsAccepted: z.literal(true, {
    message: "You must accept the terms and conditions",
  }),
  lead: leadSchema,
  members: z.array(memberSchema).length(3, 'Exactly 3 team members are required (excluding lead)'),
});

type FormData = z.infer<typeof formSchema>;

// problemStatements removed, we use ALL_PROBLEM_STATEMENTS now

export default function Register() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [nameChecking, setNameChecking] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showTnC, setShowTnC] = useState(false);
  
  // Confirmation state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  
  // Batch number check states
  const [batchChecking, setBatchChecking] = useState(false);
  const [batchDuplicates, setBatchDuplicates] = useState<string[]>([]);
  const [timelineNotice, setTimelineNotice] = useState<string | null>(null);

  useEffect(() => {
    async function checkTimeline() {
      const res = await checkRegistrationTimelineStatus();
      if (!res.allowed) {
        setTimelineNotice(res.message);
      }
    }
    checkTimeline();
  }, []);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: '',
      theme: '',
      problemStatement: '',
      lead: { name: '', batchNumber: '', department: 'AID', year: 'II', section: '', email: '', password: '', confirmPassword: '', contactNumber: '' },
      members: [
        { name: '', batchNumber: '', department: 'AID', year: 'II', section: '' },
        { name: '', batchNumber: '', department: 'AID', year: 'II', section: '' },
        { name: '', batchNumber: '', department: 'AID', year: 'II', section: '' }
      ]
    }
  });

  const teamName = watch('teamName');
  const leadDept = watch('lead.department');
  const membersDepts = [
    watch('members.0.department'),
    watch('members.1.department'),
    watch('members.2.department'),
  ];
  const password = watch('lead.password') || '';

  // Password constraints feedback
  const pwdLength = password.length >= 8;
  const pwdUpper = /[A-Z]/.test(password);
  const pwdLower = /[a-z]/.test(password);
  const pwdNum = /[0-9]/.test(password);
  const pwdSpec = /[^A-Za-z0-9]/.test(password);

  // Theme & PS Logic
  const selectedTheme = watch('theme');
  const selectedPS = watch('problemStatement');

  useEffect(() => {
    if (selectedPS && !selectedTheme) {
      const psData = ALL_PROBLEM_STATEMENTS.find(ps => ps.id === selectedPS);
      if (psData) {
        setValue('theme', psData.themeName, { shouldValidate: true });
      }
    }
  }, [selectedPS, selectedTheme, setValue]);

  const themeOptions = HACKATHON_THEMES.map(t => ({ value: t.name, label: t.name }));
  const psOptions = selectedTheme 
    ? HACKATHON_THEMES.find(t => t.name === selectedTheme)?.problemStatements.map(ps => ({ value: ps.id, label: `${ps.id}: ${ps.name}` })) || []
    : ALL_PROBLEM_STATEMENTS.map(ps => ({ value: ps.id, label: `${ps.id}: ${ps.name}` }));

  // Live Batch Number Checker
  const leadBatch = watch('lead.batchNumber');
  const memberBatches = [
    watch('members.0.batchNumber'),
    watch('members.1.batchNumber'),
    watch('members.2.batchNumber')
  ];

  useEffect(() => {
    const checkBatches = async () => {
      const allBatches = [leadBatch, ...memberBatches].filter(b => b && b.length === 6);
      if (allBatches.length === 0) {
        setBatchDuplicates([]);
        return;
      }
      setBatchChecking(true);
      const res = await checkBatchNumbers(allBatches);
      if (res.success && res.duplicates) {
        setBatchDuplicates(res.duplicates);
      }
      setBatchChecking(false);
    };

    const timeoutId = setTimeout(checkBatches, 800);
    return () => clearTimeout(timeoutId);
  }, [leadBatch, ...memberBatches]);

  useEffect(() => {
    const checkName = async () => {
      if (!teamName || teamName.length < 3) {
        setNameAvailable(null);
        return;
      }
      setNameChecking(true);
      try {
        const { isUnique } = await checkTeamNameUnique(teamName);
        setNameAvailable(isUnique === true);
      } catch (err) {
        setNameAvailable(null);
      }
      setNameChecking(false);
    };
    
    const timeoutId = setTimeout(checkName, 500);
    return () => clearTimeout(timeoutId);
  }, [teamName]);

  const onSubmit = (data: FormData) => {
    setError('');
    if (nameAvailable === false) {
      setError('Team name is already taken. Please choose another.');
      return;
    }
    if (batchDuplicates.length > 0) {
      setError(`Cannot register. The following batch numbers are already registered: ${batchDuplicates.join(', ')}`);
      return;
    }
    
    // Save valid form data and show confirmation modal
    setPendingFormData(data);
    setShowConfirmModal(true);
  };

  const processRegistration = async () => {
    if (!pendingFormData) return;
    const data = pendingFormData;
    
    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      const { isUnique, error: uniqueErr } = await checkTeamNameUnique(data.teamName);
      if (uniqueErr || !isUnique) {
        throw new Error(uniqueErr || 'Team name is already taken');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, data.lead.email, data.lead.password);
      
      const { password, confirmPassword, ...leadDataWithoutPassword } = data.lead;
      
      const psData = ALL_PROBLEM_STATEMENTS.find(ps => ps.id === data.problemStatement);
      
      const result = await registerTeamData(
        data.teamName,
        data.theme,
        data.problemStatement, // psId
        psData?.name || 'Unknown', // psName
        data.lead.email,
        leadDataWithoutPassword,
        data.members
      );

      if (!result.success) {
        await userCredential.user.delete();
        throw new Error(result.error);
      }

      router.replace('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const renderSectionField = (dept: string, registerName: any, errorMsg: any) => {
    if (dept === 'AID' || dept === 'CSE') {
      return (
        <div>
          <label className="block text-sm font-medium mb-1">Section *</label>
          <select {...register(registerName)} className="w-full p-2 border rounded-md bg-white">
            <option value="">Select</option>
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
          {errorMsg && <p className="text-red-500 text-xs mt-1">{errorMsg}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-24 bg-gray-50 text-gray-900 relative">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-2xl p-8 border border-gray-100 relative">
        <Link href="/" className="absolute top-6 left-6 text-gray-500 hover:text-gray-900 transition p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-4xl font-extrabold text-center mb-8 text-blue-600">Hackwell Registration</h1>
        
        {timelineNotice && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 p-5 rounded-xl mb-6 text-center font-medium shadow-sm">
            <h3 className="text-base font-bold text-amber-900 mb-1">Registration Timeline Notice</h3>
            <p className="text-sm text-amber-800">{timelineNotice}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Team Info */}
          <section className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
            <h2 className="text-2xl font-bold mb-4 text-blue-900">Team Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Team Name (Unique) *</label>
                <div className="relative">
                  <input {...register('teamName')} className="w-full p-2 border rounded-md" />
                  <div className="absolute right-3 top-2.5">
                    {nameChecking && <span className="text-gray-400 text-xs">Checking...</span>}
                    {!nameChecking && nameAvailable === true && <span className="text-green-600 text-sm font-bold">✓ Available</span>}
                    {!nameChecking && nameAvailable === false && <span className="text-red-600 text-sm font-bold">✗ Taken</span>}
                  </div>
                </div>
                {errors.teamName && <p className="text-red-500 text-xs mt-1">{errors.teamName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Theme *</label>
                <Controller
                  name="theme"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      {...field}
                      instanceId="theme-select"
                      options={themeOptions}
                      className="text-sm"
                      placeholder="Select Theme..."
                      value={themeOptions.find(c => c.value === field.value) || null}
                      onChange={val => {
                        field.onChange(val?.value);
                        setValue('problemStatement', '', { shouldValidate: true });
                      }}
                    />
                  )}
                />
                {errors.theme && <p className="text-red-500 text-xs mt-1">{errors.theme.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Problem Statement *</label>
                <Controller
                  name="problemStatement"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      {...field}
                      instanceId="ps-select"
                      options={psOptions}
                      className="text-sm"
                      placeholder="Search problem statement..."
                      value={psOptions.find(c => c.value === field.value) || null}
                      onChange={val => field.onChange(val?.value)}
                    />
                  )}
                />
                {errors.problemStatement && <p className="text-red-500 text-xs mt-1">{errors.problemStatement.message}</p>}
              </div>
            </div>
          </section>

          {/* Team Lead */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Team Lead (Person 1)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input {...register('lead.name')} className="w-full p-2 border rounded-md" />
                {errors.lead?.name && <p className="text-red-500 text-xs mt-1">{errors.lead.name.message}</p>}
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" {...register('lead.email')} className="w-full p-2 border rounded-md" />
                {errors.lead?.email && <p className="text-red-500 text-xs mt-1">{errors.lead.email.message}</p>}
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Password *</label>
                <div className="relative">
                  <input 
                    {...register('lead.password')} 
                    type={showPassword ? 'text' : 'password'} 
                    className="w-full p-2 border rounded-md pr-10" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 z-10"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.lead?.password && <p className="text-red-500 text-xs mt-1">{errors.lead.password.message}</p>}
                
                {/* Password Constraints */}
                <div className="mt-2 text-xs grid grid-cols-2 gap-1">
                  <span className={pwdLength ? "text-green-600" : "text-gray-500"}>✓ Min 8 chars</span>
                  <span className={pwdUpper ? "text-green-600" : "text-gray-500"}>✓ 1 Uppercase</span>
                  <span className={pwdLower ? "text-green-600" : "text-gray-500"}>✓ 1 Lowercase</span>
                  <span className={pwdNum ? "text-green-600" : "text-gray-500"}>✓ 1 Number</span>
                  <span className={pwdSpec ? "text-green-600" : "text-gray-500"}>✓ 1 Special Char</span>
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Confirm Password *</label>
                <div className="relative">
                  <input 
                    {...register('lead.confirmPassword')} 
                    type={showPassword ? 'text' : 'password'} 
                    className="w-full p-2 border rounded-md pr-10" 
                  />
                </div>
                {errors.lead?.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.lead.confirmPassword.message}</p>}
              </div>

              <div className="lg:col-span-1">
                <label className="block text-sm font-medium mb-1">Contact Number *</label>
                <input {...register('lead.contactNumber')} className="w-full p-2 border rounded-md" placeholder="e.g. 9876543210" />
                {errors.lead?.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.lead.contactNumber.message}</p>}
              </div>

              <div className="lg:col-span-1">
                <label className="block text-sm font-medium mb-1">Batch Number *</label>
                <div className="relative">
                  <input {...register('lead.batchNumber')} className="w-full p-2 border rounded-md" placeholder="e.g. 123456" />
                  {batchChecking && <div className="absolute right-3 top-2.5 text-gray-400 text-xs">Checking...</div>}
                </div>
                {errors.lead?.batchNumber && <p className="text-red-500 text-xs mt-1">{errors.lead.batchNumber.message}</p>}
                {batchDuplicates.includes(leadBatch) && <p className="text-red-600 text-xs mt-1 font-bold">Batch number already taken</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Department *</label>
                <select {...register('lead.department')} className="w-full p-2 border rounded-md bg-white">
                  {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.lead?.department && <p className="text-red-500 text-xs mt-1">{errors.lead.department.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Year *</label>
                <select {...register('lead.year')} className="w-full p-2 border rounded-md bg-white">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {errors.lead?.year && <p className="text-red-500 text-xs mt-1">{errors.lead.year.message}</p>}
              </div>

              {renderSectionField(leadDept, 'lead.section', errors.lead?.section?.message)}
            </div>
          </section>

          {/* Members */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Team Members (Strictly 3 Required)</h2>
            {[0, 1, 2].map((index) => (
              <div key={index} className="mb-6 pb-6 border-b border-gray-300 last:border-0 last:pb-0">
                <h3 className="font-semibold mb-3 text-blue-800">Member {index + 2}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input {...register(`members.${index}.name` as const)} className="w-full p-2 border rounded-md" />
                    {errors.members?.[index]?.name && <p className="text-red-500 text-xs mt-1">{errors.members[index]?.name?.message}</p>}
                  </div>
                  <div className="lg:col-span-1">
                      <label className="block text-sm font-medium mb-1">Batch Number *</label>
                      <div className="relative">
                        <input {...register(`members.${index}.batchNumber`)} className="w-full p-2 border rounded-md" placeholder="e.g. 123456" />
                        {batchChecking && <div className="absolute right-3 top-2.5 text-gray-400 text-xs">Checking...</div>}
                      </div>
                      {errors.members?.[index]?.batchNumber && (
                        <p className="text-red-500 text-xs mt-1">{errors.members[index]?.batchNumber?.message}</p>
                      )}
                      {batchDuplicates.includes(memberBatches[index]) && <p className="text-red-600 text-xs mt-1 font-bold">Batch number already taken</p>}
                    </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Department *</label>
                    <select {...register(`members.${index}.department` as const)} className="w-full p-2 border rounded-md bg-white">
                      {depts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.members?.[index]?.department && <p className="text-red-500 text-xs mt-1">{errors.members[index]?.department?.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Year *</label>
                    <select {...register(`members.${index}.year` as const)} className="w-full p-2 border rounded-md bg-white">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {errors.members?.[index]?.year && <p className="text-red-500 text-xs mt-1">{errors.members[index]?.year?.message}</p>}
                  </div>
                  {renderSectionField(membersDepts[index], `members.${index}.section` as const, errors.members?.[index]?.section?.message)}
                </div>
              </div>
            ))}
          </section>

          {/* Terms & Submit */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="flex items-start gap-3">
              <input 
                type="checkbox" 
                {...register('termsAccepted')} 
                className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  I accept the{' '}
                  <button 
                    type="button"
                    onClick={() => setShowTnC(true)}
                    className="text-blue-600 underline font-bold focus:outline-none"
                  >
                    Terms and Conditions
                  </button>
                  {' '}of Hackwell.
                </p>
                {errors.termsAccepted && (
                  <p className="text-red-500 text-xs mt-1">{errors.termsAccepted.message}</p>
                )}
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || nameAvailable === false || batchDuplicates.length > 0}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition disabled:opacity-50 text-lg"
            >
              {loading ? 'Processing Registration...' : 'Complete Registration'}
            </button>
          </section>
        </form>
      </div>

      {/* Terms and Conditions Modal */}
      {showTnC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Participant Terms & Conditions</h2>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-gray-700">
              <h3 className="font-bold text-lg text-gray-900">1. Student Code of Conduct</h3>
              <p>As a participant in this hackathon, you agree to treat all mentors, juries, coordinators, and fellow participants with respect. Any form of harassment, discrimination, or disruptive behavior will lead to immediate disqualification and removal from the event premises.</p>
              
              <h3 className="font-bold text-lg text-gray-900">2. Team Integrity</h3>
              <p>Your team must solely consist of the 4 members registered here. Substituting members or bringing unauthorized students into the hacking venue is strictly prohibited. You must wear your ID badges at all times.</p>

              <h3 className="font-bold text-lg text-gray-900">3. Original Work Guarantee</h3>
              <p>All projects must be originally developed during the hackathon timeframe. While using open-source libraries is permitted, you cannot submit previously built academic projects or commercial products. Juries will review code commit histories.</p>

              <h3 className="font-bold text-lg text-gray-900">4. Facility & Equipment Rules</h3>
              <p>Participants are responsible for any damage caused to university property during the event. Please keep your hacking stations clean. The organizers are not liable for the theft or loss of personal laptops and belongings.</p>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-2xl">
              <button 
                type="button" 
                onClick={() => setShowTnC(false)} 
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && pendingFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-extrabold text-blue-600">Review Your Registration</h2>
              <p className="text-gray-500 text-sm mt-1">Please double-check all details before confirming.</p>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-800">
              
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-bold text-blue-900 border-b border-blue-200 pb-2 mb-3">Team Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-blue-700 uppercase">Team Name</span>
                    <span className="font-bold">{pendingFormData.teamName}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-blue-700 uppercase">Theme</span>
                    <span className="font-bold">{pendingFormData.theme}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-xs font-semibold text-blue-700 uppercase">Problem Statement</span>
                    <span className="font-bold">
                      {ALL_PROBLEM_STATEMENTS.find(ps => ps.id === pendingFormData.problemStatement)?.name} 
                      ({pendingFormData.problemStatement})
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">Team Lead</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase">Name</span>
                    <span className="font-medium">{pendingFormData.lead.name}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase">Email</span>
                    <span className="font-medium">{pendingFormData.lead.email}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase">Batch</span>
                    <span className="font-medium">{pendingFormData.lead.batchNumber}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase">Contact</span>
                    <span className="font-medium">{pendingFormData.lead.contactNumber}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">Team Members</h3>
                <div className="space-y-3">
                  {pendingFormData.members.map((member, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div>
                        <span className="block text-xs font-semibold text-gray-500 uppercase">Member {i + 1}</span>
                        <span className="font-medium">{member.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs font-semibold text-gray-500 uppercase">Batch</span>
                        <span className="font-medium">{member.batchNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs font-semibold text-gray-500 uppercase">Dept/Yr</span>
                        <span className="font-medium">{member.department} - {member.year}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)} 
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition"
              >
                Go Back & Edit
              </button>
              <button 
                type="button" 
                onClick={processRegistration} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
