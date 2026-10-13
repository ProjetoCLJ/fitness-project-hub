import { BasicSignup } from "@/components/auth/BasicSignup";

const RegisterStudent = () => (
  <BasicSignup
    userType="student"
    roleLabel="Aluno"
    subtitle="Informe seus dados básicos. Em seguida enviamos um e-mail para você criar sua senha e concluir o cadastro."
  />
);

export default RegisterStudent;
