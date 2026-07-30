'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { checkTeamNameUnique, registerTeamData } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

const memberSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  department: z.string().min(2, 'Department is required'),
  year: z.string().min(1, 'Year is required'),
  section: z.string().min(1, 'Section is required'),
});

const formSchema = z.object({
  teamName: z.string().min(3, 'Team name must be at least 3 characters'),
  problemStatement: z.string().min(1, 'Please select a problem statement'),
  lead: memberSchema.extend({
    email: z.string().email('Invalid email').refine((val) => val.endsWith('@saranathan.ac.in'), {
      message: 'Email must end with @saranathan.ac.in',
    }),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    contactNumber: z.string().min(10, 'Valid contact number is required'),
  }),
  members: z.array(memberSchema).length(3, 'Exactly 3 team members are required (excluding lead)'),
});

type FormData = z.infer<typeof formSchema>;

export default function Register() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      members: [
        { name: '', batchNumber: '', department: '', year: '', section: '' },
        { name: '', batchNumber: '', department: '', year: '', section: '' },
        { name: '', batchNumber: '', department: '', year: '', section: '' }
      ]
    }
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    setLoading(true);
    
    try {
      // 1. Check if team name is unique
      const { isUnique, error: uniqueErr } = await checkTeamNameUnique(data.teamName);
      if (uniqueErr || !isUnique) {
        throw new Error(uniqueErr || 'Team name is already taken');
      }

      // 2. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.lead.email, data.lead.password);
      
      // 3. Register data in Firestore (encrypted via Server Action)
      const { password, ...leadDataWithoutPassword } = data.lead;
      
      const result = await registerTeamData(
        data.teamName,
        data.problemStatement,
        data.lead.email,
        leadDataWithoutPassword,
        data.members
      );

      if (!result.success) {
        // Rollback auth if firestore fails
        await userCredential.user.delete();
        throw new Error(result.error);
      }

      // Redirect to login after successful registration
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-24 bg-gray-50 text-gray-900">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl p-8">
        <h1 className="text-4xl font-extrabold text-center mb-8 text-blue-600">Hackwell Registration</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Team Info */}
          <section className="bg-blue-50 p-6 rounded-lg border border-blue-100">
            <h2 className="text-2xl font-bold mb-4">Team Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Team Name (Unique)</label>
                <input {...register('teamName')} className="w-full p-2 border rounded-md" />
                {errors.teamName && <p className="text-red-500 text-xs mt-1">{errors.teamName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Problem Statement</label>
                <select {...register('problemStatement')} className="w-full p-2 border rounded-md bg-white">
                  <option value="">Select a statement...</option>
                  <option value="AI in Healthcare">AI in Healthcare</option>
                  <option value="Fintech Solutions">Fintech Solutions</option>
                  <option value="EdTech Innovations">EdTech Innovations</option>
                  <option value="Smart City">Smart City</option>
                </select>
                {errors.problemStatement && <p className="text-red-500 text-xs mt-1">{errors.problemStatement.message}</p>}
              </div>
            </div>
          </section>

          {/* Team Lead */}
          <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold mb-4">Team Lead (Person 1)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input {...register('lead.name')} className="w-full p-2 border rounded-md" />
                {errors.lead?.name && <p className="text-red-500 text-xs mt-1">{errors.lead.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email (@saranathan.ac.in)</label>
                <input type="email" {...register('lead.email')} className="w-full p-2 border rounded-md" />
                {errors.lead?.email && <p className="text-red-500 text-xs mt-1">{errors.lead.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" {...register('lead.password')} className="w-full p-2 border rounded-md" />
                {errors.lead?.password && <p className="text-red-500 text-xs mt-1">{errors.lead.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Number</label>
                <input {...register('lead.contactNumber')} className="w-full p-2 border rounded-md" />
                {errors.lead?.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.lead.contactNumber.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Batch Number</label>
                <input {...register('lead.batchNumber')} className="w-full p-2 border rounded-md" />
                {errors.lead?.batchNumber && <p className="text-red-500 text-xs mt-1">{errors.lead.batchNumber.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input {...register('lead.department')} className="w-full p-2 border rounded-md" />
                {errors.lead?.department && <p className="text-red-500 text-xs mt-1">{errors.lead.department.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <input {...register('lead.year')} className="w-full p-2 border rounded-md" />
                {errors.lead?.year && <p className="text-red-500 text-xs mt-1">{errors.lead.year.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section</label>
                <input {...register('lead.section')} className="w-full p-2 border rounded-md" />
                {errors.lead?.section && <p className="text-red-500 text-xs mt-1">{errors.lead.section.message}</p>}
              </div>
            </div>
          </section>

          {/* Members */}
          <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold mb-4">Team Members (3 Required)</h2>
            {[0, 1, 2].map((index) => (
              <div key={index} className="mb-6 pb-6 border-b border-gray-300 last:border-0 last:pb-0">
                <h3 className="font-semibold mb-3">Member {index + 2}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input {...register(`members.${index}.name` as const)} className="w-full p-2 border rounded-md" />
                    {errors.members?.[index]?.name && <p className="text-red-500 text-xs mt-1">{errors.members[index]?.name?.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Batch Number</label>
                    <input {...register(`members.${index}.batchNumber` as const)} className="w-full p-2 border rounded-md" />
                    {errors.members?.[index]?.batchNumber && <p className="text-red-500 text-xs mt-1">{errors.members[index]?.batchNumber?.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Department</label>
                    <input {...register(`members.${index}.department` as const)} className="w-full p-2 border rounded-md" />
                    {errors.members?.[index]?.department && <p className="text-red-500 text-xs mt-1">{errors.members[index]?.department?.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Year</label>
                    <input {...register(`members.${index}.year` as const)} className="w-full p-2 border rounded-md" />
                    {errors.members?.[index]?.year && <p className="text-red-500 text-xs mt-1">{errors.members[index]?.year?.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Section</label>
                    <input {...register(`members.${index}.section` as const)} className="w-full p-2 border rounded-md" />
                    {errors.members?.[index]?.section && <p className="text-red-500 text-xs mt-1">{errors.members[index]?.section?.message}</p>}
                  </div>
                </div>
              </div>
            ))}
          </section>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register Team'}
          </button>
        </form>
      </div>
    </main>
  );
}
