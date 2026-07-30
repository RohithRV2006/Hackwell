'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { checkTeamNameUnique, registerTeamData } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import Select from 'react-select';

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
  email: z.string().email('Invalid email').refine((val) => val.endsWith('@saranathan.ac.in'), {
    message: 'Must end with @saranathan.ac.in',
  }),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  contactNumber: z.string().min(10, 'Valid contact number is required'),
}).superRefine(memberSuperRefine);

const memberSchema = baseMemberSchema.superRefine(memberSuperRefine);

const formSchema = z.object({
  teamName: z.string().min(3, 'Must be at least 3 characters'),
  problemStatement: z.string().min(1, 'Please select a problem statement'),
  termsAccepted: z.literal(true, {
    message: "You must accept the terms and conditions",
  }),
  lead: leadSchema,
  members: z.array(memberSchema).length(3, 'Exactly 3 team members are required (excluding lead)'),
});

type FormData = z.infer<typeof formSchema>;

const problemStatements = [
  { value: 'AI in Healthcare', label: 'AI in Healthcare' },
  { value: 'Fintech Solutions', label: 'Fintech Solutions' },
  { value: 'EdTech Innovations', label: 'EdTech Innovations' },
  { value: 'Smart City Infrastructure', label: 'Smart City Infrastructure' },
  { value: 'Cybersecurity Enhancements', label: 'Cybersecurity Enhancements' },
];

export default function Register() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [nameChecking, setNameChecking] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: '',
      problemStatement: '',
      lead: { name: '', batchNumber: '', department: 'AID', year: 'II', section: '', email: '', password: '', contactNumber: '' },
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

  const onSubmit = async (data: FormData) => {
    setError('');
    
    if (nameAvailable === false) {
      setError('Team name is already taken. Please choose another.');
      return;
    }

    setLoading(true);
    
    try {
      const { isUnique, error: uniqueErr } = await checkTeamNameUnique(data.teamName);
      if (uniqueErr || !isUnique) {
        throw new Error(uniqueErr || 'Team name is already taken');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, data.lead.email, data.lead.password);
      
      const { password, ...leadDataWithoutPassword } = data.lead;
      
      const result = await registerTeamData(
        data.teamName,
        data.problemStatement,
        data.lead.email,
        leadDataWithoutPassword,
        data.members
      );

      if (!result.success) {
        await userCredential.user.delete();
        throw new Error(result.error);
      }

      router.push('/login?registered=true');
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
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-24 bg-gray-50 text-gray-900">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <h1 className="text-4xl font-extrabold text-center mb-8 text-blue-600">Hackwell Registration</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Team Info */}
          <section className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
            <h2 className="text-2xl font-bold mb-4 text-blue-900">Team Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <label className="block text-sm font-medium mb-1">Problem Statement *</label>
                <Controller
                  name="problemStatement"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      {...field}
                      options={problemStatements}
                      className="text-sm"
                      placeholder="Search problem statement..."
                      value={problemStatements.find(c => c.value === field.value)}
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
                <label className="block text-sm font-medium mb-1">Email (@saranathan.ac.in) *</label>
                <input type="email" {...register('lead.email')} className="w-full p-2 border rounded-md" />
                {errors.lead?.email && <p className="text-red-500 text-xs mt-1">{errors.lead.email.message}</p>}
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input type="password" {...register('lead.password')} className="w-full p-2 border rounded-md" />
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
                <label className="block text-sm font-medium mb-1">Contact Number *</label>
                <input {...register('lead.contactNumber')} className="w-full p-2 border rounded-md" />
                {errors.lead?.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.lead.contactNumber.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Batch Number (6 digits) *</label>
                <input {...register('lead.batchNumber')} className="w-full p-2 border rounded-md" maxLength={6} />
                {errors.lead?.batchNumber && <p className="text-red-500 text-xs mt-1">{errors.lead.batchNumber.message}</p>}
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
                  <div>
                    <label className="block text-sm font-medium mb-1">Batch (6 digits) *</label>
                    <input {...register(`members.${index}.batchNumber` as const)} className="w-full p-2 border rounded-md" maxLength={6} />
                    {errors.members?.[index]?.batchNumber && <p className="text-red-500 text-xs mt-1">{errors.members[index]?.batchNumber?.message}</p>}
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

          {/* Terms & Conditions */}
          <div className="flex items-start bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                {...register('termsAccepted')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-900">
                I agree to the <a href="#" className="text-blue-600 hover:underline" onClick={(e) => e.preventDefault()}>Terms and Conditions</a>
              </label>
              <p className="text-gray-500 text-xs mt-1">By checking this box, you confirm that all details provided are accurate and adhere to the event rules.</p>
              {errors.termsAccepted && <p className="text-red-500 text-xs mt-1">{errors.termsAccepted.message}</p>}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || nameAvailable === false}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 text-lg shadow-md"
          >
            {loading ? 'Registering Team...' : 'Register Team'}
          </button>
        </form>
      </div>
    </main>
  );
}
