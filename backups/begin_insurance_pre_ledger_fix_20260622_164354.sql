--
-- PostgreSQL database dump
--

\restrict okXxKYmFdimmabwvCuOD2nZDdmv6oVFGOSvd2QDfNu2zzWSx103szAthzl9kL2U

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: CancellationReason; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CancellationReason" AS ENUM (
    'CUSTOMER_DECLINED',
    'CUSTOMER_REQUESTED_CANCELLATION',
    'PREMIUM_TOO_HIGH',
    'CUSTOMER_PURCHASED_ELSEWHERE',
    'CUSTOMER_NOT_REACHABLE',
    'POLICY_ISSUED_INCORRECTLY',
    'WRONG_POLICY_DETAILS',
    'KYC_DOCUMENTS_NOT_PROVIDED',
    'INSURER_REJECTED_PROPOSAL',
    'PAYMENT_NOT_RECEIVED',
    'PROPOSAL_EXPIRED',
    'POLICY_REPLACED',
    'RENEWAL_NOT_PROCEEDED',
    'DUPLICATE_ENTRY',
    'DUPLICATE_POLICY_IMPORTED',
    'TEST_DUMMY_ENTRY',
    'OTHER'
);


ALTER TYPE public."CancellationReason" OWNER TO postgres;

--
-- Name: InsuranceCategory; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InsuranceCategory" AS ENUM (
    'LIFE',
    'HEALTH',
    'GENERAL',
    'MOTOR',
    'TRAVEL',
    'PROPERTY',
    'COMMERCIAL'
);


ALTER TYPE public."InsuranceCategory" OWNER TO postgres;

--
-- Name: InsurerType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InsurerType" AS ENUM (
    'GENERAL',
    'HEALTH',
    'LIFE'
);


ALTER TYPE public."InsurerType" OWNER TO postgres;

--
-- Name: InvoiceCancellationReason; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InvoiceCancellationReason" AS ENUM (
    'DUPLICATE_INVOICE',
    'INCORRECT_TAXABLE_VALUE',
    'WRONG_INSURER_SELECTED',
    'GST_CALCULATION_ERROR',
    'REPLACED_BY_NEW_INVOICE',
    'TEST_DUMMY_INVOICE',
    'CLIENT_REQUEST',
    'PAYMENT_REVERSED',
    'OTHER'
);


ALTER TYPE public."InvoiceCancellationReason" OWNER TO postgres;

--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'DRAFT',
    'ISSUED',
    'CANCELLED',
    'FINALIZED'
);


ALTER TYPE public."InvoiceStatus" OWNER TO postgres;

--
-- Name: LeadType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LeadType" AS ENUM (
    'POSP',
    'LEADERSHIP',
    'LEAD_EXECUTIVE'
);


ALTER TYPE public."LeadType" OWNER TO postgres;

--
-- Name: PaymentFrequency; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentFrequency" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'HALF_YEARLY',
    'YEARLY',
    'TWO_YEAR',
    'THREE_YEAR'
);


ALTER TYPE public."PaymentFrequency" OWNER TO postgres;

--
-- Name: PolicyStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PolicyStatus" AS ENUM (
    'ACTIVE',
    'PENDING',
    'EXPIRED',
    'CANCELLED'
);


ALTER TYPE public."PolicyStatus" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'OWNER'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: StatementStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StatementStatus" AS ENUM (
    'DRAFT',
    'FINALIZED',
    'INVOICED',
    'CANCELLED'
);


ALTER TYPE public."StatementStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: incentive_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incentive_entries (
    id integer NOT NULL,
    "employeeId" integer NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "totalCalls" integer DEFAULT 0 NOT NULL,
    "touchBase" integer DEFAULT 0 NOT NULL,
    interested integer DEFAULT 0 NOT NULL,
    "followUp" integer DEFAULT 0 NOT NULL,
    conversion integer DEFAULT 0 NOT NULL,
    "calculatedPoints" numeric(10,2) NOT NULL,
    "calculatedAmount" numeric(18,2) NOT NULL,
    remarks text,
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "conversionType" text,
    "businessPoints" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.incentive_entries OWNER TO postgres;

--
-- Name: incentive_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.incentive_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.incentive_entries_id_seq OWNER TO postgres;

--
-- Name: incentive_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.incentive_entries_id_seq OWNED BY public.incentive_entries.id;


--
-- Name: incentive_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incentive_settings (
    id integer NOT NULL,
    "touchBasePoints" numeric(10,2) DEFAULT 0 NOT NULL,
    "interestedPoints" numeric(10,2) DEFAULT 0 NOT NULL,
    "followUpPoints" numeric(10,2) DEFAULT 0 NOT NULL,
    "conversionPoints" numeric(10,2) DEFAULT 0 NOT NULL,
    "amountPerPoint" numeric(10,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "healthConversionPoints" numeric(10,2) DEFAULT 0 NOT NULL,
    "lifeConversionPoints" numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.incentive_settings OWNER TO postgres;

--
-- Name: incentive_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.incentive_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.incentive_settings_id_seq OWNER TO postgres;

--
-- Name: incentive_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.incentive_settings_id_seq OWNED BY public.incentive_settings.id;


--
-- Name: incentives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incentives (
    id integer NOT NULL,
    "leadMemberId" integer NOT NULL,
    month text NOT NULL,
    points numeric(10,2) NOT NULL,
    "pointValue" numeric(10,2) DEFAULT 0.50 NOT NULL,
    "incentiveAmount" numeric(18,2) NOT NULL,
    remarks text,
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "deletedById" integer,
    "isDeleted" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.incentives OWNER TO postgres;

--
-- Name: incentives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.incentives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.incentives_id_seq OWNER TO postgres;

--
-- Name: incentives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.incentives_id_seq OWNED BY public.incentives.id;


--
-- Name: insurer_invoice_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurer_invoice_profiles (
    id integer NOT NULL,
    "insurerId" integer NOT NULL,
    "recipientHeader" text NOT NULL,
    "legalName" text NOT NULL,
    "billingAddress" text NOT NULL,
    state text NOT NULL,
    "stateCode" text NOT NULL,
    gstin text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.insurer_invoice_profiles OWNER TO postgres;

--
-- Name: insurer_invoice_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.insurer_invoice_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insurer_invoice_profiles_id_seq OWNER TO postgres;

--
-- Name: insurer_invoice_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insurer_invoice_profiles_id_seq OWNED BY public.insurer_invoice_profiles.id;


--
-- Name: insurer_statements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurer_statements (
    id integer NOT NULL,
    "insurerId" integer NOT NULL,
    "statementRefNo" text NOT NULL,
    "statementDate" timestamp(3) without time zone NOT NULL,
    "creditDate" timestamp(3) without time zone,
    "businessMonth" text NOT NULL,
    remarks text,
    "statementFileUrl" text,
    "totalTaxableValue" numeric(18,2) DEFAULT 0 NOT NULL,
    "cgstRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "cgstAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "sgstRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "sgstAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "igstRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "igstAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "invoiceValue" numeric(18,2) DEFAULT 0 NOT NULL,
    status public."StatementStatus" DEFAULT 'DRAFT'::public."StatementStatus" NOT NULL,
    "invoiceId" integer,
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "amountCredited" numeric(18,2),
    "bankAccount" text,
    "bankReference" text,
    "natureOfTransaction" text
);


ALTER TABLE public.insurer_statements OWNER TO postgres;

--
-- Name: insurer_statements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.insurer_statements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insurer_statements_id_seq OWNER TO postgres;

--
-- Name: insurer_statements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insurer_statements_id_seq OWNED BY public.insurer_statements.id;


--
-- Name: insurers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurers (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    gstin text,
    "insurerType" public."InsurerType",
    state text
);


ALTER TABLE public.insurers OWNER TO postgres;

--
-- Name: insurers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.insurers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insurers_id_seq OWNER TO postgres;

--
-- Name: insurers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insurers_id_seq OWNED BY public.insurers.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    "invoiceNumber" text NOT NULL,
    "invoiceDate" timestamp(3) without time zone NOT NULL,
    "insurerId" integer NOT NULL,
    "billingMonth" text NOT NULL,
    description text NOT NULL,
    "lineItemText" text NOT NULL,
    "policyCount" integer NOT NULL,
    "taxableValue" numeric(18,2) NOT NULL,
    "cgstRate" numeric(5,2) NOT NULL,
    "cgstAmount" numeric(18,2) NOT NULL,
    "sgstRate" numeric(5,2) NOT NULL,
    "sgstAmount" numeric(18,2) NOT NULL,
    "igstRate" numeric(5,2) NOT NULL,
    "igstAmount" numeric(18,2) NOT NULL,
    "totalAmount" numeric(18,2) NOT NULL,
    "totalInWords" text NOT NULL,
    "recipientHeader" text NOT NULL,
    "recipientLegalName" text NOT NULL,
    "recipientAddress" text NOT NULL,
    "recipientState" text NOT NULL,
    "recipientStateCode" text NOT NULL,
    "recipientGstin" text NOT NULL,
    status public."InvoiceStatus" DEFAULT 'DRAFT'::public."InvoiceStatus" NOT NULL,
    notes text,
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "insurerName" text,
    "isGstExempt" boolean DEFAULT false NOT NULL,
    "cancellationReason" public."InvoiceCancellationReason",
    "cancellationReasonOther" text,
    "cancelledAt" timestamp(3) without time zone,
    "cancelledById" integer
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: lead_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_members (
    id integer NOT NULL,
    name text NOT NULL,
    "leadType" public."LeadType" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.lead_members OWNER TO postgres;

--
-- Name: lead_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_members_id_seq OWNER TO postgres;

--
-- Name: lead_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_members_id_seq OWNED BY public.lead_members.id;


--
-- Name: policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.policies (
    id integer NOT NULL,
    "productName" text NOT NULL,
    "customerName" text NOT NULL,
    "customerPhone" text,
    "policyNumber" text NOT NULL,
    "renewalDate" timestamp(3) without time zone NOT NULL,
    "grossPremium" numeric(18,2) NOT NULL,
    "netPremium" numeric(18,2) NOT NULL,
    "commissionAmount" numeric(18,2) NOT NULL,
    "leadSource" text NOT NULL,
    "paymentMode" text,
    "invoiceNumber" text,
    "invoiceDate" timestamp(3) without time zone,
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "commissionPercent" numeric(8,4) NOT NULL,
    "creditedDate" timestamp(3) without time zone,
    "customerEmail" text,
    "finalReceivable" numeric(18,2) NOT NULL,
    "gstAmount" numeric(18,2) NOT NULL,
    "gstPercent" numeric(8,4) NOT NULL,
    "insuranceCategory" public."InsuranceCategory" NOT NULL,
    "insurerName" text NOT NULL,
    "issueDate" timestamp(3) without time zone NOT NULL,
    "paymentFrequency" public."PaymentFrequency" NOT NULL,
    remarks text,
    status public."PolicyStatus" DEFAULT 'ACTIVE'::public."PolicyStatus" NOT NULL,
    "tdsAmount" numeric(18,2) NOT NULL,
    "tdsPercent" numeric(8,4) NOT NULL,
    "cancellationReason" public."CancellationReason",
    "cancellationReasonOther" text,
    "cancelledAt" timestamp(3) without time zone,
    "cancelledById" integer,
    "invoiceRaised" boolean DEFAULT false NOT NULL,
    "invoiceRaisedAt" timestamp(3) without time zone,
    "nextDueDate" timestamp(3) without time zone
);


ALTER TABLE public.policies OWNER TO postgres;

--
-- Name: policies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.policies_id_seq OWNER TO postgres;

--
-- Name: policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.policies_id_seq OWNED BY public.policies.id;


--
-- Name: posp_commission_overrides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posp_commission_overrides (
    id integer NOT NULL,
    "pospMemberId" integer NOT NULL,
    "policyId" integer NOT NULL,
    "commissionRate" numeric(8,4) NOT NULL,
    "brokerageAmount" numeric(18,2) NOT NULL,
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.posp_commission_overrides OWNER TO postgres;

--
-- Name: posp_commission_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posp_commission_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posp_commission_overrides_id_seq OWNER TO postgres;

--
-- Name: posp_commission_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posp_commission_overrides_id_seq OWNED BY public.posp_commission_overrides.id;


--
-- Name: posp_incentive_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posp_incentive_entries (
    id integer NOT NULL,
    "pospMemberId" integer NOT NULL,
    "policyId" integer,
    "isManual" boolean DEFAULT false NOT NULL,
    "entryDate" timestamp(3) without time zone NOT NULL,
    "policyNumber" text NOT NULL,
    "customerName" text NOT NULL,
    "policyType" text,
    premium numeric(18,2) NOT NULL,
    "commissionRate" numeric(6,2) NOT NULL,
    "pospShare" numeric(6,2) NOT NULL,
    brokerage numeric(18,2) NOT NULL,
    "pospCommission" numeric(18,2) NOT NULL,
    "orgCommission" numeric(18,2) NOT NULL,
    "paymentStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "invoiceReference" text,
    "invoiceDate" timestamp(3) without time zone,
    remarks text,
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "isImported" boolean DEFAULT false NOT NULL,
    "pospBillDate" timestamp(3) without time zone,
    "pospBillFilePath" text,
    "pospBillNo" text
);


ALTER TABLE public.posp_incentive_entries OWNER TO postgres;

--
-- Name: posp_incentive_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posp_incentive_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posp_incentive_entries_id_seq OWNER TO postgres;

--
-- Name: posp_incentive_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posp_incentive_entries_id_seq OWNED BY public.posp_incentive_entries.id;


--
-- Name: posp_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posp_members (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    mobile text,
    email text,
    "joiningDate" timestamp(3) without time zone,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    remarks text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.posp_members OWNER TO postgres;

--
-- Name: posp_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posp_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posp_members_id_seq OWNER TO postgres;

--
-- Name: posp_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posp_members_id_seq OWNED BY public.posp_members.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    "insurerId" integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "insuranceCategory" public."InsuranceCategory"
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: statement_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statement_policies (
    id integer NOT NULL,
    "statementId" integer NOT NULL,
    "policyId" integer NOT NULL,
    "taxableValue" numeric(18,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.statement_policies OWNER TO postgres;

--
-- Name: statement_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.statement_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statement_policies_id_seq OWNER TO postgres;

--
-- Name: statement_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.statement_policies_id_seq OWNED BY public.statement_policies.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'OWNER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: incentive_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentive_entries ALTER COLUMN id SET DEFAULT nextval('public.incentive_entries_id_seq'::regclass);


--
-- Name: incentive_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentive_settings ALTER COLUMN id SET DEFAULT nextval('public.incentive_settings_id_seq'::regclass);


--
-- Name: incentives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentives ALTER COLUMN id SET DEFAULT nextval('public.incentives_id_seq'::regclass);


--
-- Name: insurer_invoice_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurer_invoice_profiles ALTER COLUMN id SET DEFAULT nextval('public.insurer_invoice_profiles_id_seq'::regclass);


--
-- Name: insurer_statements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurer_statements ALTER COLUMN id SET DEFAULT nextval('public.insurer_statements_id_seq'::regclass);


--
-- Name: insurers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurers ALTER COLUMN id SET DEFAULT nextval('public.insurers_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: lead_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_members ALTER COLUMN id SET DEFAULT nextval('public.lead_members_id_seq'::regclass);


--
-- Name: policies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies ALTER COLUMN id SET DEFAULT nextval('public.policies_id_seq'::regclass);


--
-- Name: posp_commission_overrides id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_commission_overrides ALTER COLUMN id SET DEFAULT nextval('public.posp_commission_overrides_id_seq'::regclass);


--
-- Name: posp_incentive_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_incentive_entries ALTER COLUMN id SET DEFAULT nextval('public.posp_incentive_entries_id_seq'::regclass);


--
-- Name: posp_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_members ALTER COLUMN id SET DEFAULT nextval('public.posp_members_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: statement_policies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_policies ALTER COLUMN id SET DEFAULT nextval('public.statement_policies_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
6318c379-7cf9-4546-a494-773f4f54c33c	649059fa2753d57f89b6133a5a9c2dc79877e71048d84bf34bca655a37a9d85b	2026-06-12 10:27:40.570564+05:30	20260612045740_incentive_soft_delete	\N	\N	2026-06-12 10:27:40.557806+05:30	1
37fe83c2-b63b-4944-a5be-c547e2422a58	a06f75049bf2846368848de8032d68057d9764a4cf65910d7fc7f7f850fb514c	2026-05-31 16:56:40.177888+05:30	20260531112640_add_policy_table	\N	\N	2026-05-31 16:56:40.139586+05:30	1
5cfead81-93f7-47ab-a096-299b8017faa8	7485bc5b7934e90f24b04c11f7b3010a0ea28854bb3e0a7d084d49dcd2796b20	2026-05-31 17:00:02.076913+05:30	20260531113002_rebuild_policy_schema	\N	\N	2026-05-31 17:00:02.061071+05:30	1
ee6229d0-30b1-4cd7-98e6-11e819a9b867	4c26936856398526bc7c59c079036dcdd83d8be620c3f8043a45e01c4474ec68	2026-06-18 12:44:20.732975+05:30	20260618071420_add_isimported_to_posp_entries	\N	\N	2026-06-18 12:44:20.730191+05:30	1
d49fd1fb-52b8-4f8c-87d3-50879b4ff10d	867e241b77a03edb92473adfe376d8ee35ec0a2b44f106af4c9e1b59e4bed004	2026-05-31 17:03:36.898075+05:30	20260531113336_expand_insurance_category	\N	\N	2026-05-31 17:03:36.894749+05:30	1
c82a45dc-0deb-4e2e-95b6-71123b87bf93	7e4d0556391a1fab977e5d0bcebc1d8349fee273e5e3d0aeb72c6abd1399063f	2026-06-15 10:09:05.036364+05:30	20260615043905_add_invoice_raised_tracking	\N	\N	2026-06-15 10:09:05.024195+05:30	1
50019848-4489-496f-9eb5-cd63669bb72d	615b9538833591317037a51cb4d9080a9be4ad36b494c2f9da97e2b34657c565	2026-06-02 21:01:25.159135+05:30	20260602153125_add_master_tables	\N	\N	2026-06-02 21:01:25.11732+05:30	1
4afda7f8-d310-4547-b8bf-6731e111a1d6	20905de6b422853c76aa1e5ea1e82331f3d6d2017a22130aaab5bc505a64e66a	2026-06-03 09:51:20.433209+05:30	20260603042120_add_lead_executive_and_invoice_profile	\N	\N	2026-06-03 09:51:20.405332+05:30	1
f565a249-d0cb-4251-b584-5c7f7bd7199a	c7f6f71a9d9f7a4da257d110f8c9c891ec3869c28010ca6e2cc10aae5f901edd	2026-06-03 18:18:32.679022+05:30	20260603124832_add_invoice_model	\N	\N	2026-06-03 18:18:32.647745+05:30	1
3e893b7d-03dd-4cbe-9238-fe8bf68d3e27	146353877b3705472cf20995313290dc8a1c08387b201f1fe97e26916d53a8d1	2026-06-15 10:48:27.250902+05:30	20260615051746_extend_payment_frequency_enum	\N	\N	2026-06-15 10:48:27.24005+05:30	1
7befd836-b73f-4db9-990b-1e88dfa61389	c686cf8c90b0b1d122633366fb7b12c7a8a53ac17501617260166541f29d1418	2026-06-03 19:02:02.02197+05:30	20260603190140_invoice_finalized_and_insurer_snapshot	\N	\N	2026-06-03 19:02:02.016873+05:30	1
7578d72b-02d8-4e15-b18a-2c7bea11d3ba	514066dbffad177904ff2df8ac5d842425e00beb0655621a099d81c2556386ee	2026-06-09 11:42:02.962487+05:30	20260609061202_add_insurer_statements	\N	\N	2026-06-09 11:42:02.916583+05:30	1
d8a64b98-bff7-40c0-b23c-8574a562576b	2ee71e43e7a8f10cc0569cfa5a9cbfbeb0fde0dfcd91a6bcbc6e8a178b9d6f29	2026-06-09 14:28:21.530273+05:30	20260609085821_add_report_fields	\N	\N	2026-06-09 14:28:21.522069+05:30	1
70bf7db9-06e7-4d85-876e-9a73abf25fe1	aa8d8fdfa2eb3a6de30b3886776367568232615c95e049df656f20dd49ba78cf	2026-06-15 10:57:29.63582+05:30	20260615052729_add_daily_incentive_module	\N	\N	2026-06-15 10:57:29.60297+05:30	1
73574e47-5e7f-4d6b-aab6-2031f677c262	cd05c39025962f1da705daddceda556f5c80e77978a55875a85fef0ada2ed8df	2026-06-09 16:45:55.648433+05:30	20260609111555_module_5_master_data_and_cancellation	\N	\N	2026-06-09 16:45:55.626017+05:30	1
18c92e80-d281-4a4a-88dd-4804d56c8835	95c25067f31b06330b99687760ad4fadfc6db1cbb4b1f1a23ef0fa791d51f7f7	2026-06-09 17:28:07.80172+05:30	20260609115807_module_5_invoice_cancellation_reason	\N	\N	2026-06-09 17:28:07.79113+05:30	1
63b9dc99-0e3d-43e7-b533-43884daf2162	26e6a9480e151319a55e187658cb6899673e6955a4006087550b8445b9d55c71	2026-06-19 11:19:32.163074+05:30	20260619054932_add_business_points_to_incentive_entry	\N	\N	2026-06-19 11:19:32.157001+05:30	1
67878a4b-7bca-4d7e-996f-c556f205bfe8	63ad96a18e0d94453b2030298e5d2c3ff8ca2dccff2a5f33b28cee2927071ddc	2026-06-11 15:35:49.8943+05:30	20260611100549_add_lead_executive_incentives	\N	\N	2026-06-11 15:35:49.870341+05:30	1
c370448f-3f23-4ec0-be96-25dff5c1213d	1e86c200c33f61302e3457f77de1636aa7cfae2d29fb8d2ae87d41571d44ee7c	2026-06-15 11:45:23.294666+05:30	20260615061523_add_nature_of_transaction	\N	\N	2026-06-15 11:45:23.290032+05:30	1
431af12b-842d-499a-b52c-1374f9ca8cd4	44e5907e73f605f0712a9aab0275b19ba8d7e9a18c7c98348aff14cd827f48f6	2026-06-18 10:50:00.226107+05:30	20260618052000_add_conversion_type_and_life_health_points	\N	\N	2026-06-18 10:50:00.220649+05:30	1
86746362-c432-454d-bb29-f71aa6677892	397b6d5716b79b34030f7ea0249aece88388aa44f41d1e0f8dc82f27a911cedb	2026-06-19 12:16:20.621392+05:30	20260619064620_add_posp_bill_fields	\N	\N	2026-06-19 12:16:20.61754+05:30	1
524256d1-36d8-4ae9-b3b7-51a806c6b108	a015354b5f07a9ef82e42798f6fed608f78cec9647199a4c3c2c36fdb2c1e315	2026-06-18 11:45:21.775725+05:30	20260618061521_add_posp_module	\N	\N	2026-06-18 11:45:21.75645+05:30	1
0fee50a4-c96c-4f47-b5a8-6357a27d85d4	42a5f590e01d964d115e7877b895add12a61b289039af4f9aac6e4a494ccc955	2026-06-18 12:06:07.891791+05:30	20260618063607_add_posp_incentive_entries	\N	\N	2026-06-18 12:06:07.878334+05:30	1
\.


--
-- Data for Name: incentive_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incentive_entries (id, "employeeId", date, "totalCalls", "touchBase", interested, "followUp", conversion, "calculatedPoints", "calculatedAmount", remarks, "createdById", "createdAt", "updatedAt", "conversionType", "businessPoints") FROM stdin;
22	26	2026-06-19 00:00:00	130	100	2	0	1	1050.00	525.00	life policy issued	1	2026-06-19 09:14:42.642	2026-06-19 09:15:14.482	\N	1000
\.


--
-- Data for Name: incentive_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incentive_settings (id, "touchBasePoints", "interestedPoints", "followUpPoints", "conversionPoints", "amountPerPoint", "createdAt", "updatedAt", "healthConversionPoints", "lifeConversionPoints") FROM stdin;
1	0.00	0.00	0.00	200.00	0.00	2026-06-15 05:31:35.022	2026-06-22 05:23:07.471	0.00	0.00
\.


--
-- Data for Name: incentives; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incentives (id, "leadMemberId", month, points, "pointValue", "incentiveAmount", remarks, "createdById", "createdAt", "updatedAt", "deletedAt", "deletedById", "isDeleted") FROM stdin;
18	25	2026-06	2000.00	0.50	1000.00	life plan, conversion and score point	1	2026-06-12 09:05:41.457	2026-06-12 09:05:41.457	\N	\N	f
26	25	2026-07	200.00	0.50	100.00	\N	1	2026-06-15 05:38:40.35	2026-06-15 05:38:45.755	2026-06-15 05:38:45.747	1	t
\.


--
-- Data for Name: insurer_invoice_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurer_invoice_profiles (id, "insurerId", "recipientHeader", "legalName", "billingAddress", state, "stateCode", gstin, active, "createdAt", "updatedAt") FROM stdin;
1	35	United India Insurance Company Limited	The United India Insurance Company Limited	24, Whites Road, Chennai 600 014	Tamil Nadu	033	33AAACU5552C1ZQ	t	2026-06-03 04:23:14.126	2026-06-03 04:23:14.126
2	32	GO DIGIT	Go Digit	Raj Kamal Pinnacle 3rd Floor, New No.2 Old No.145 Nungambakkam High Road, Thousand Lights West Nungambakkam, Chennai 600 034	Tamil Nadu	033	33AACCO4128Q1Z7	t	2026-06-03 04:23:14.145	2026-06-03 04:23:14.145
3	29	HDFC Ergo	HDFC Ergo General Insurance Company Limited	New No.528, Old No.559, 2nd Floor, Anna Salai, Teynampet Chennai 600018	Tamil Nadu	033	33AABCL5045N1ZF	t	2026-06-03 04:23:14.15	2026-06-03 04:23:14.15
4	37	STAR Health	Star Health Allied Insurance Co Ltd	New Tank Street, No.1 Valluvar Kottam High Road, Nungambakkam, Chennai 600 035	Tamil Nadu	033	33AAJCS4517L1Z5	t	2026-06-03 04:23:14.156	2026-06-03 04:23:14.156
5	30	Tata AIA Life Insurance Company Limited	Tata AIA Life Insurance Company Limited	4th Floor Bascon Maeru Towers, No. 82,84 & 86 Kodambakkam High Road, Tirumurthi Nagar, Nungambakkam Chennai 600 034	Tamil Nadu	033	33AABCT3784C1ZK	t	2026-06-03 04:23:14.162	2026-06-03 04:23:14.162
6	27	ICICI LOMBARD	ICICI Lombard GICL	Third Floor, Unit No.684-690, Seethakathi Business Centre, Anna Salai, Thousand Lights	Tamil Nadu	033	33AAACI7904G2ZT	t	2026-06-03 04:23:14.168	2026-06-03 04:23:14.168
\.


--
-- Data for Name: insurer_statements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurer_statements (id, "insurerId", "statementRefNo", "statementDate", "creditDate", "businessMonth", remarks, "statementFileUrl", "totalTaxableValue", "cgstRate", "cgstAmount", "sgstRate", "sgstAmount", "igstRate", "igstAmount", "invoiceValue", status, "invoiceId", "createdById", "createdAt", "updatedAt", "amountCredited", "bankAccount", "bankReference", "natureOfTransaction") FROM stdin;
1	17	TEST-001	2026-06-09 00:00:00	2026-06-09 00:00:00	2026-05	testing gst module	\N	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	CANCELLED	\N	1	2026-06-09 07:08:36.091	2026-06-09 07:10:45.816	\N	\N	\N	\N
3	27	001	2026-06-03 00:00:00	\N	2026-02	\N	\N	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	DRAFT	\N	1	2026-06-09 11:49:12.109	2026-06-09 11:49:12.109	\N	\N	\N	\N
8	38	ICICI/9579055	2026-03-31 00:00:00	2026-04-10 00:00:00	2026-02	\N	\N	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	CANCELLED	\N	1	2026-06-10 07:51:51.843	2026-06-10 07:53:39.148	\N	\N	\N	\N
5	29	CREDIT-TEST-001	2026-06-10 00:00:00	2026-07-15 00:00:00	2026-06	Credits Report Final Testing	\N	0.00	9.00	0.00	9.00	0.00	0.00	0.00	0.00	FINALIZED	\N	1	2026-06-10 04:00:36.02	2026-06-22 05:22:12.13	\N	\N	\N	\N
2	29	TEST-002	2026-06-09 00:00:00	\N	2026-06	testing gst module	\N	9970.20	9.00	897.32	9.00	897.32	0.00	0.00	11764.84	CANCELLED	\N	1	2026-06-09 07:12:18.418	2026-06-22 05:22:35.257	\N	\N	\N	\N
6	29	CREDIT-TEST-002	2026-06-10 00:00:00	2026-07-15 00:00:00	2026-06	Credits Report Final Testing	\N	0.00	9.00	0.00	9.00	0.00	0.00	0.00	0.00	CANCELLED	\N	1	2026-06-10 04:03:38.646	2026-06-22 05:22:35.257	\N	\N	\N	\N
7	29	CREDIT TEST 003	2026-06-10 00:00:00	2026-07-15 00:00:00	2026-06	credit report tests final	\N	10000.00	9.00	900.00	9.00	900.00	0.00	0.00	11800.00	CANCELLED	\N	1	2026-06-10 04:06:29.575	2026-06-22 05:22:35.257	10800.00	HDFC CURRENT ACCOUNT	HDFCREF001	\N
4	29	HDFC-JUN-TEST-001	2026-06-10 00:00:00	2026-07-15 00:00:00	2026-06	Credits Report testing	\N	10000.00	9.00	900.00	9.00	900.00	0.00	0.00	11800.00	CANCELLED	\N	1	2026-06-10 03:37:50.999	2026-06-22 05:22:35.257	11800.00	HDFC Current Account	HDFCREF001	Brokerage Credit
\.


--
-- Data for Name: insurers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insurers (id, name, active, "createdAt", "updatedAt", gstin, "insurerType", state) FROM stdin;
26	ICICI Prudential Life	t	2026-06-03 04:22:15.729	2026-06-03 04:22:15.729	\N	\N	\N
28	Cholamandalam General	t	2026-06-03 04:22:15.77	2026-06-03 04:22:15.77	\N	\N	\N
29	HDFC Ergo General	t	2026-06-03 04:22:15.772	2026-06-03 04:22:15.772	\N	\N	\N
31	Go Digit Life	t	2026-06-03 04:22:15.777	2026-06-03 04:22:15.777	\N	\N	\N
32	Go Digit General	t	2026-06-03 04:22:15.78	2026-06-03 04:22:15.78	\N	\N	\N
17	LIC	t	2026-06-02 15:32:15.985	2026-06-03 04:22:15.784	\N	\N	\N
35	United India General	t	2026-06-03 04:22:15.785	2026-06-03 04:22:15.785	\N	\N	\N
36	New India Assurance	t	2026-06-03 04:22:15.787	2026-06-03 04:22:15.787	\N	\N	\N
37	Star Health Insurance	t	2026-06-03 04:22:15.789	2026-06-03 04:22:15.789	\N	\N	\N
38	Care Health	t	2026-06-03 04:22:15.79	2026-06-03 04:22:15.79	\N	\N	\N
39	NivaBupa Health	t	2026-06-03 04:22:15.792	2026-06-03 04:22:15.792	\N	\N	\N
2	ICICI Pru Life	f	2026-06-02 15:32:15.96	2026-06-03 04:22:15.793	\N	\N	\N
1	ICICI Lombard	f	2026-06-02 15:32:15.945	2026-06-03 04:22:15.796	\N	\N	\N
8	Cholamandalam	f	2026-06-02 15:32:15.969	2026-06-03 04:22:15.797	\N	\N	\N
4	HDFC ERGO	f	2026-06-02 15:32:15.964	2026-06-03 04:22:15.799	\N	\N	\N
9	TATA AIA	f	2026-06-02 15:32:15.971	2026-06-03 04:22:15.801	\N	\N	\N
12	Digit Life	f	2026-06-02 15:32:15.977	2026-06-03 04:22:15.802	\N	\N	\N
11	Digit General	f	2026-06-02 15:32:15.975	2026-06-03 04:22:15.804	\N	\N	\N
13	Pramerica	f	2026-06-02 15:32:15.979	2026-06-03 04:22:15.806	\N	\N	\N
6	United India Ins	f	2026-06-02 15:32:15.966	2026-06-03 04:22:15.807	\N	\N	\N
7	New India Ins	f	2026-06-02 15:32:15.968	2026-06-03 04:22:15.809	\N	\N	\N
3	STAR Health	f	2026-06-02 15:32:15.962	2026-06-03 04:22:15.811	\N	\N	\N
5	Care health	f	2026-06-02 15:32:15.965	2026-06-03 04:22:15.812	\N	\N	\N
18	Niva Bupa	f	2026-06-02 15:32:15.986	2026-06-03 04:22:15.814	\N	\N	\N
14	HDFC Life	f	2026-06-02 15:32:15.98	2026-06-03 04:22:15.816	\N	\N	\N
15	Bajaj Life	f	2026-06-02 15:32:15.982	2026-06-03 04:22:15.817	\N	\N	\N
16	SBI Life	f	2026-06-02 15:32:15.983	2026-06-03 04:22:15.819	\N	\N	\N
19	Galaxy Gen	f	2026-06-02 15:32:15.988	2026-06-03 04:22:15.821	\N	\N	\N
21	Future Generali	f	2026-06-02 15:32:15.99	2026-06-03 04:22:15.824	\N	\N	\N
22	Kotak Gen Ins	f	2026-06-02 15:32:15.992	2026-06-03 04:22:15.826	\N	\N	\N
23	Bajaj Gen	f	2026-06-02 15:32:15.994	2026-06-03 04:22:15.828	\N	\N	\N
24	SBI Gen	f	2026-06-02 15:32:15.996	2026-06-03 04:22:15.829	\N	\N	\N
25	Digit Health	f	2026-06-02 15:32:15.997	2026-06-03 04:22:15.831	\N	\N	\N
10	Max Life	f	2026-06-02 15:32:15.973	2026-06-03 04:22:15.832	\N	\N	\N
20	Aditya Birla	f	2026-06-02 15:32:15.989	2026-06-09 11:42:40.48	\N	\N	\N
30	Tata AIA Life	t	2026-06-03 04:22:15.774	2026-06-09 12:44:28.458	\N	\N	\N
27	ICICI Lombard General	t	2026-06-03 04:22:15.746	2026-06-11 06:04:39.892	\N	\N	\N
33	Pramerica Life	f	2026-06-03 04:22:15.782	2026-06-11 06:04:55.14	\N	\N	\N
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, "invoiceNumber", "invoiceDate", "insurerId", "billingMonth", description, "lineItemText", "policyCount", "taxableValue", "cgstRate", "cgstAmount", "sgstRate", "sgstAmount", "igstRate", "igstAmount", "totalAmount", "totalInWords", "recipientHeader", "recipientLegalName", "recipientAddress", "recipientState", "recipientStateCode", "recipientGstin", status, notes, "createdById", "createdAt", "updatedAt", "insurerName", "isGstExempt", "cancellationReason", "cancellationReasonOther", "cancelledAt", "cancelledById") FROM stdin;
1	BG049	2026-06-04 12:13:50.884	27	2026-04	Brokerage for the month of April 2026		0	0.00	9.00	0.00	9.00	0.00	0.00	0.00	0.00	Zero rupees only	ICICI LOMBARD	ICICI Lombard GICL	Third Floor, Unit No.684-690, Seethakathi Business Centre, Anna Salai, Thousand Lights	Tamil Nadu	033	33AAACI7904G2ZT	CANCELLED	\N	1	2026-06-04 12:13:50.909	2026-06-04 12:53:28.096	ICICI Lombard General	f	\N	\N	\N	\N
5	BG053	2026-06-05 11:47:34.98	37	2026-01	Brokerage for the month of January 2026	Health Insurance - 3 Nos	3	2995.65	9.00	269.61	9.00	269.61	0.00	0.00	3534.87	Three thousand five hundred and thirty four rupees and eighty seven paise only	STAR Health	Star Health Allied Insurance Co Ltd	New Tank Street, No.1 Valluvar Kottam High Road, Nungambakkam, Chennai 600 035	Tamil Nadu	033	33AAJCS4517L1Z5	CANCELLED	\N	1	2026-06-05 11:47:34.996	2026-06-05 11:55:30.535	Star Health Insurance	f	\N	\N	\N	\N
2	BG050	2026-06-04 12:14:57.836	29	2026-04	Brokerage for the month of April 2026	Motor Insurance (mixed) - 4 Nos	4	0.00	9.00	0.00	9.00	0.00	0.00	0.00	0.00	Zero rupees only	HDFC Ergo	HDFC Ergo General Insurance Company Limited	New No.528, Old No.559, 2nd Floor, Anna Salai, Teynampet Chennai 600018	Tamil Nadu	033	33AABCL5045N1ZF	CANCELLED	\N	1	2026-06-04 12:14:57.848	2026-06-09 11:26:37.09	HDFC Ergo General	f	\N	\N	\N	\N
3	BG051	2026-06-04 12:29:21.892	27	2026-02	Brokerage for the month of February 2026	Health Insurance - 5 Nos	5	66001.91	9.00	5940.17	9.00	5940.17	0.00	0.00	77882.25	Seventy seven thousand eight hundred and eighty two rupees and twenty five paise only	ICICI LOMBARD	ICICI Lombard GICL	Third Floor, Unit No.684-690, Seethakathi Business Centre, Anna Salai, Thousand Lights	Tamil Nadu	033	33AAACI7904G2ZT	CANCELLED	\N	1	2026-06-04 12:29:21.905	2026-06-09 11:41:28.985	ICICI Lombard General	f	\N	\N	\N	\N
8	BG056	2026-06-10 03:39:17.529	29	2026-06	Brokerage for the month of June 2026	Health Insurance - 1 Nos	1	10000.00	9.00	900.00	9.00	900.00	0.00	0.00	11800.00	Eleven thousand eight hundred rupees only	HDFC Ergo	HDFC Ergo General Insurance Company Limited	New No.528, Old No.559, 2nd Floor, Anna Salai, Teynampet Chennai 600018	Tamil Nadu	033	33AABCL5045N1ZF	CANCELLED	\N	1	2026-06-10 03:39:17.536	2026-06-10 04:05:04.963	HDFC Ergo General	f	TEST_DUMMY_INVOICE	\N	2026-06-10 04:05:04.96	1
7	BG055	2026-06-09 12:04:58.047	27	2026-01	Brokerage for the month of January 2026	Health Insurance - 5 Nos	5	138.18	9.00	12.44	9.00	12.44	0.00	0.00	163.06	One hundred and sixty three rupees and six paise only	ICICI LOMBARD	ICICI Lombard GICL	Third Floor, Unit No.684-690, Seethakathi Business Centre, Anna Salai, Thousand Lights	Tamil Nadu	033	33AAACI7904G2ZT	CANCELLED	\N	1	2026-06-09 12:04:58.062	2026-06-09 12:46:08.531	ICICI Lombard General	f	DUPLICATE_INVOICE	\N	2026-06-09 12:46:08.526	1
6	BG054	2026-06-09 07:13:40.025	29	2026-06	Brokerage for the month of June 2026	Health Insurance - 1 Nos	1	9970.20	9.00	897.32	9.00	897.32	0.00	0.00	11764.84	Eleven thousand seven hundred and sixty four rupees and eighty four paise only	HDFC Ergo	HDFC Ergo General Insurance Company Limited	New No.528, Old No.559, 2nd Floor, Anna Salai, Teynampet Chennai 600018	Tamil Nadu	033	33AABCL5045N1ZF	CANCELLED	\N	1	2026-06-09 07:13:40.029	2026-06-09 12:46:52.036	HDFC Ergo General	f	DUPLICATE_INVOICE	\N	2026-06-09 12:46:52.029	1
4	BG052	2026-06-04 12:54:03.135	37	2026-02	Brokerage for the month of February 2026	Health Insurance - 5 Nos	5	23334.28	9.00	2100.09	9.00	2100.09	0.00	0.00	27534.46	Twenty seven thousand five hundred and thirty four rupees and forty six paise only	STAR Health	Star Health Allied Insurance Co Ltd	New Tank Street, No.1 Valluvar Kottam High Road, Nungambakkam, Chennai 600 035	Tamil Nadu	033	33AAJCS4517L1Z5	CANCELLED	\N	1	2026-06-04 12:54:03.145	2026-06-10 03:31:10.157	Star Health Insurance	f	TEST_DUMMY_INVOICE	\N	2026-06-10 03:31:10.155	1
9	BG057	2026-06-10 04:04:32.398	29	2026-06	Brokerage for the month of June 2026	Health Insurance - 1 Nos	1	0.00	9.00	0.00	9.00	0.00	0.00	0.00	0.00	Zero rupees only	HDFC Ergo	HDFC Ergo General Insurance Company Limited	New No.528, Old No.559, 2nd Floor, Anna Salai, Teynampet Chennai 600018	Tamil Nadu	033	33AABCL5045N1ZF	CANCELLED	\N	1	2026-06-10 04:04:32.402	2026-06-10 04:05:20.925	HDFC Ergo General	f	TEST_DUMMY_INVOICE	\N	2026-06-10 04:05:20.922	1
10	BG058	2026-06-10 04:07:04.749	29	2026-06	Brokerage for the month of June 2026	Health Insurance - 1 Nos	1	10000.00	9.00	900.00	9.00	900.00	0.00	0.00	11800.00	Eleven thousand eight hundred rupees only	HDFC Ergo	HDFC Ergo General Insurance Company Limited	New No.528, Old No.559, 2nd Floor, Anna Salai, Teynampet Chennai 600018	Tamil Nadu	033	33AABCL5045N1ZF	CANCELLED	\N	1	2026-06-10 04:07:04.751	2026-06-10 07:04:10.282	HDFC Ergo General	f	TEST_DUMMY_INVOICE	\N	2026-06-10 07:04:10.28	1
12	BG060	2026-06-13 12:23:10.774	27	2026-02	Brokerage for the month of February 2026	Health Insurance - 5 Nos	5	66001.91	9.00	5940.17	9.00	5940.17	0.00	0.00	77882.25	Seventy seven thousand eight hundred and eighty two rupees and twenty five paise only	ICICI LOMBARD	ICICI Lombard GICL	Third Floor, Unit No.684-690, Seethakathi Business Centre, Anna Salai, Thousand Lights	Tamil Nadu	033	33AAACI7904G2ZT	FINALIZED	\N	1	2026-06-13 12:23:10.799	2026-06-13 12:23:10.799	ICICI Lombard General	f	\N	\N	\N	\N
11	BG059	2026-06-13 04:54:28.633	30	2026-07	Brokerage for the month of July 2026	Life Insurance - 1 Nos	1	2000.00	9.00	180.00	9.00	180.00	0.00	0.00	2360.00	Two thousand three hundred and sixty rupees only	Tata AIA Life Insurance Company Limited	Tata AIA Life Insurance Company Limited	4th Floor Bascon Maeru Towers, No. 82,84 & 86 Kodambakkam High Road, Tirumurthi Nagar, Nungambakkam Chennai 600 034	Tamil Nadu	033	33AABCT3784C1ZK	CANCELLED	\N	1	2026-06-13 04:54:28.64	2026-06-15 04:53:44.501	Tata AIA Life	f	TEST_DUMMY_INVOICE	\N	2026-06-15 04:53:44.495	1
13	BG061	2026-06-15 07:29:14.621	29	2026-06	Brokerage for the month of June 2026	Health Insurance - 1 Nos	1	0.00	9.00	0.00	9.00	0.00	0.00	0.00	0.00	Zero rupees only	HDFC Ergo	HDFC Ergo General Insurance Company Limited	New No.528, Old No.559, 2nd Floor, Anna Salai, Teynampet Chennai 600018	Tamil Nadu	033	33AABCL5045N1ZF	CANCELLED	\N	1	2026-06-15 07:29:14.63	2026-06-22 05:22:12.135	HDFC Ergo General	f	TEST_DUMMY_INVOICE	\N	2026-06-22 05:22:12.128	1
\.


--
-- Data for Name: lead_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_members (id, name, "leadType", active, "createdAt", "updatedAt") FROM stdin;
19	Ranjith	LEADERSHIP	t	2026-06-03 04:22:15.835	2026-06-03 04:22:15.835
20	Sridhar	LEADERSHIP	t	2026-06-03 04:22:15.841	2026-06-03 04:22:15.841
21	Ramesh	LEADERSHIP	t	2026-06-03 04:22:15.843	2026-06-03 04:22:15.843
14	Aruna Devi	LEAD_EXECUTIVE	t	2026-06-02 15:32:16.253	2026-06-03 04:22:15.844
23	Pandiyan Direct	LEAD_EXECUTIVE	t	2026-06-03 04:22:15.846	2026-06-03 04:22:15.846
24	Shalini Dinesh	LEAD_EXECUTIVE	t	2026-06-03 04:22:15.848	2026-06-03 04:22:15.848
25	Oviya	LEAD_EXECUTIVE	t	2026-06-03 04:22:15.85	2026-06-03 04:22:15.85
26	Namitha	LEAD_EXECUTIVE	t	2026-06-03 04:22:15.852	2026-06-03 04:22:15.852
12	Sugitha	POSP	t	2026-06-02 15:32:16.249	2026-06-03 04:22:15.853
11	Ramaraj	POSP	t	2026-06-02 15:32:16.247	2026-06-03 04:22:15.855
29	Vinoth Madhesh	POSP	t	2026-06-03 04:22:15.857	2026-06-03 04:22:15.857
30	Baskaran Ramasamy	POSP	t	2026-06-03 04:22:15.859	2026-06-03 04:22:15.859
31	Manimegalai	POSP	t	2026-06-03 04:22:15.861	2026-06-03 04:22:15.861
32	Eshwaramurthy	POSP	t	2026-06-03 04:22:15.863	2026-06-03 04:22:15.863
33	Shivamurthy	POSP	t	2026-06-03 04:22:15.864	2026-06-03 04:22:15.864
34	Siva Ponamaravathy	POSP	t	2026-06-03 04:22:15.866	2026-06-03 04:22:15.866
35	Anbu Sundaram	POSP	t	2026-06-03 04:22:15.868	2026-06-03 04:22:15.868
36	Ranganathan Jackal	POSP	t	2026-06-03 04:22:15.869	2026-06-03 04:22:15.869
1	Bhaskar	POSP	f	2026-06-02 15:32:16.226	2026-06-03 04:22:15.871
2	Ranga	POSP	f	2026-06-02 15:32:16.23	2026-06-03 04:22:15.873
3	Madhesh	POSP	f	2026-06-02 15:32:16.232	2026-06-03 04:22:15.875
4	Eashwar	POSP	f	2026-06-02 15:32:16.234	2026-06-03 04:22:15.877
5	Siva	POSP	f	2026-06-02 15:32:16.236	2026-06-03 04:22:15.878
6	Mahalakshmi	POSP	f	2026-06-02 15:32:16.237	2026-06-03 04:22:15.88
7	Sivamurthy	POSP	f	2026-06-02 15:32:16.239	2026-06-03 04:22:15.881
8	Manikandan	POSP	f	2026-06-02 15:32:16.241	2026-06-03 04:22:15.883
9	Manimehalai	POSP	f	2026-06-02 15:32:16.243	2026-06-03 04:22:15.885
10	Syed	POSP	f	2026-06-02 15:32:16.245	2026-06-03 04:22:15.886
13	Pandiyan	LEADERSHIP	f	2026-06-02 15:32:16.251	2026-06-03 04:22:15.887
15	Shalini D	LEADERSHIP	f	2026-06-02 15:32:16.255	2026-06-03 04:22:15.889
16	Geetha	LEADERSHIP	f	2026-06-02 15:32:16.257	2026-06-03 04:22:15.891
17	Leadership	LEADERSHIP	f	2026-06-02 15:32:16.259	2026-06-03 04:22:15.892
18	Others	LEADERSHIP	f	2026-06-02 15:32:16.261	2026-06-03 04:22:15.894
\.


--
-- Data for Name: policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.policies (id, "productName", "customerName", "customerPhone", "policyNumber", "renewalDate", "grossPremium", "netPremium", "commissionAmount", "leadSource", "paymentMode", "invoiceNumber", "invoiceDate", "createdById", "createdAt", "updatedAt", "commissionPercent", "creditedDate", "customerEmail", "finalReceivable", "gstAmount", "gstPercent", "insuranceCategory", "insurerName", "issueDate", "paymentFrequency", remarks, status, "tdsAmount", "tdsPercent", "cancellationReason", "cancellationReasonOther", "cancelledAt", "cancelledById", "invoiceRaised", "invoiceRaisedAt", "nextDueDate") FROM stdin;
61	Full Package Chevrolet Tavera	SARAVANAN B	9952991271	1708003125P114811380	2026-12-22 00:00:00	12651.00	10721.00	0.00	Ranga	ONLINE	BG021	2026-01-16 00:00:00	1	2026-05-31 12:53:05.073	2026-05-31 12:53:05.073	0.0000	2026-02-16 00:00:00	\N	0.00	1929.78	18.0000	MOTOR	United India Ins	2025-12-22 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-22 00:00:00
159	Optima Secure	SHANMUGATHAI B	9677992073	28000000329756	2027-05-05 00:00:00	91881.00	91881.00	0.00	Aruna Devi	\N	\N	\N	1	2026-05-31 12:53:05.689	2026-06-22 05:22:35.263	0.0000	\N	\N	0.00	16538.58	18.0000	HEALTH	HDFC ERGO	2026-05-05 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-05 00:00:00
122	Kotti Suraksha	MURUGAPPAN K	9842370120	3317208360738200000	2027-03-16 00:00:00	5535.00	5535.00	1964.93	Shalini D	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.506	2026-05-31 12:53:05.506	35.5000	\N	\N	1768.44	996.30	18.0000	GENERAL	HDFC ERGO	2026-03-16 00:00:00	YEARLY	FRESH	ACTIVE	196.49	10.0000	\N	\N	\N	\N	f	\N	2027-03-16 00:00:00
123	Motor Package	ALAGAPPAN R	9865451124	1708003125P119601974	2027-03-17 00:00:00	1603.00	1603.00	80.15	Siva	\N	BG040	2026-04-16 00:00:00	1	2026-05-31 12:53:05.514	2026-05-31 12:53:05.514	5.0000	\N	\N	72.13	288.54	18.0000	MOTOR	United India Ins	2026-03-17 00:00:00	YEARLY	FRESH	ACTIVE	8.02	10.0000	\N	\N	\N	\N	f	\N	2027-03-17 00:00:00
1	Elevate	Naveen Senguttuvan	9360454839	100029591300	2026-11-21 00:00:00	8073.00	8073.00	968.76	Ranga	CARD	BG016	2025-12-19 00:00:00	1	2026-05-31 12:06:11.765	2026-05-31 12:06:11.765	12.0000	2025-12-25 00:00:00	naveen@gmail.com	871.98	1453.14	18.0000	HEALTH	ICICI Lombard	2025-11-21 00:00:00	YEARLY	Health policy converted through POSP referral.	ACTIVE	96.78	9.9900	\N	\N	\N	\N	f	\N	2026-11-21 00:00:00
2	Family Optima	Bhavani Kumar	9840012345	SH202511002	2026-10-12 00:00:00	15420.00	15419.98	2312.89	Bhaskar	UPI	BG017	2025-10-15 00:00:00	1	2026-05-31 12:13:11.672	2026-05-31 12:13:11.672	14.9993	2025-10-20 00:00:00	bhavani@gmail.com	2081.60	2775.60	18.0000	HEALTH	STAR Health	2025-10-12 00:00:00	YEARLY	\N	ACTIVE	231.29	10.0000	\N	\N	\N	\N	f	\N	2026-10-12 00:00:00
3	Car Secure	Arjun Raj	9876543210	HDMOTOR003	2026-09-08 00:00:00	22150.00	22150.00	2214.98	Pandiyan	ONLINE	BG018	2025-09-10 00:00:00	1	2026-05-31 12:17:18.874	2026-05-31 12:17:18.874	9.9999	2025-09-18 00:00:00	arjun@gmail.com	1993.48	3984.78	17.9900	MOTOR	HDFC ERGO	2025-09-08 00:00:00	YEARLY	\N	ACTIVE	221.50	10.0000	\N	\N	\N	\N	f	\N	2026-09-08 00:00:00
4	Car Insurance	R BHASKARAN RAMASAMY	9811812347	3001/399980049/00/B00	2026-07-11 00:00:00	25109.00	25109.00	4770.71	Bhaskar	\N	BG001	2025-09-03 00:00:00	1	2026-05-31 12:53:04.655	2026-05-31 12:53:04.655	19.0000	2025-10-08 00:00:00	\N	4293.64	4519.62	18.0000	MOTOR	ICICI Lombard	2025-07-11 00:00:00	YEARLY	\N	ACTIVE	477.07	10.0000	\N	\N	\N	\N	f	\N	2026-07-11 00:00:00
5	Car Insurance	RANJITH SRINIVASAN	9841421221	3001/400164197/00	2026-07-14 00:00:00	24982.00	24982.00	0.00	Leadership	\N	BG001	2025-09-03 00:00:00	1	2026-05-31 12:53:04.677	2026-05-31 12:53:04.677	0.0000	2025-10-08 00:00:00	\N	0.00	4496.76	18.0000	MOTOR	ICICI Lombard	2025-07-14 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-07-14 00:00:00
6	Professional Indemnity	Bigin Insurance Brokers Private Limited	7358649484	713600CN250000013938	2026-08-07 00:00:00	53100.00	53100.00	0.00	Leadership	\N	BG002	2025-09-08 00:00:00	1	2026-05-31 12:53:04.684	2026-05-31 12:53:04.684	0.0000	2025-10-09 00:00:00	\N	0.00	9558.00	18.0000	COMMERCIAL	New India Ins	2025-08-07 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-08-07 00:00:00
7	Warehouse Insurance	Discovery House Distributors Pvt Ltd	9003106567	1708001125P108086855	2026-08-19 00:00:00	5376.00	5376.00	0.00	Leadership	\N	BG003	2025-09-08 00:00:00	1	2026-05-31 12:53:04.691	2026-05-31 12:53:04.691	0.0000	2025-09-09 00:00:00	\N	0.00	967.68	18.0000	COMMERCIAL	United India Ins	2025-08-19 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-08-19 00:00:00
8	Car Insurance	Container Seals and Industries	9789052402	3001/403901298/00	2026-08-17 00:00:00	6812.00	6812.00	0.00	Leadership	\N	BG004	2025-09-12 00:00:00	1	2026-05-31 12:53:04.698	2026-05-31 12:53:04.698	0.0000	2025-10-08 00:00:00	\N	0.00	1226.16	18.0000	MOTOR	ICICI Lombard	2025-08-17 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-08-17 00:00:00
9	Health Insurance	Sasikumar	8883614097	2856207658825500000	2026-08-19 00:00:00	29951.51	29951.51	0.00	Leadership	\N	BG015	2025-12-15 00:00:00	1	2026-05-31 12:53:04.705	2026-05-31 12:53:04.705	0.0000	\N	\N	0.00	5391.27	18.0000	HEALTH	HDFC ERGO	2025-08-19 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-08-19 00:00:00
10	Term Insurance	Dr. Keerthi S	9488031347	K6711626	2026-09-25 00:00:00	76713.00	76713.00	42192.15	Leadership	\N	BG007	2025-10-15 00:00:00	1	2026-05-31 12:53:04.712	2026-05-31 12:53:04.712	55.0000	2025-10-03 00:00:00	\N	37972.93	13808.34	18.0000	LIFE	ICICI Pru Life	2025-09-25 00:00:00	YEARLY	\N	ACTIVE	4219.22	10.0000	\N	\N	\N	\N	f	\N	2026-09-25 00:00:00
153	I Protect Smart Plus	PARTHASARATHY SELVARAJ	9488809343	K8718031	2026-05-07 00:00:00	44844.00	44844.00	0.00	Aruna Devi	\N	BG042	2026-05-12 00:00:00	1	2026-05-31 12:53:05.662	2026-05-31 12:53:05.662	0.0000	\N	\N	0.00	8071.92	18.0000	LIFE	ICICI Pru Life	2026-04-07 00:00:00	MONTHLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-05-07 00:00:00
12	Vehicle Insurance	P Balakrishnan	9841040134	1708003125P109281287	2026-09-10 00:00:00	27082.00	27082.00	1354.10	Ranga	\N	BG006	2025-10-15 00:00:00	1	2026-05-31 12:53:04.725	2026-05-31 12:53:04.725	5.0000	2025-10-15 00:00:00	\N	1218.69	4874.76	18.0000	MOTOR	United India Ins	2025-09-10 00:00:00	YEARLY	\N	ACTIVE	135.41	10.0000	\N	\N	\N	\N	f	\N	2026-09-10 00:00:00
13	Vehicle Insurance	Mr Dhananjayan K	9742438686	1708003125P109555865	2026-09-16 00:00:00	843.00	843.00	0.00	Shalini D	\N	BG006	2025-10-15 00:00:00	1	2026-05-31 12:53:04.733	2026-05-31 12:53:04.733	0.0000	2025-10-15 00:00:00	\N	0.00	151.74	18.0000	MOTOR	United India Ins	2025-09-16 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-09-16 00:00:00
14	Health Assure	Hemanath Veerapandian	7550141229	4995112600087174	2026-09-22 00:00:00	18460.00	18460.00	6461.00	Pandiyan	\N	BG005	2025-10-13 00:00:00	1	2026-05-31 12:53:04.739	2026-05-31 12:53:04.739	35.0000	2025-11-14 00:00:00	\N	5814.90	3322.80	18.0000	HEALTH	STAR Health	2025-09-22 00:00:00	YEARLY	\N	ACTIVE	646.10	10.0000	\N	\N	\N	\N	f	\N	2026-09-22 00:00:00
15	Health Assure	Veerapandian P	9843299829	3766112600074280	2026-09-22 00:00:00	31395.00	31395.00	10988.25	Pandiyan	\N	BG005	2025-10-15 00:00:00	1	2026-05-31 12:53:04.746	2026-05-31 12:53:04.746	35.0000	2025-10-15 00:00:00	\N	9889.42	5651.10	18.0000	HEALTH	STAR Health	2025-09-22 00:00:00	YEARLY	\N	ACTIVE	1098.83	10.0000	\N	\N	\N	\N	f	\N	2026-09-22 00:00:00
16	Super Surplus Topup	Suresh Ravi	8428144267	1651112600053075	2026-09-25 00:00:00	3335.00	3335.00	1167.25	Pandiyan	\N	BG005	2025-10-15 00:00:00	1	2026-05-31 12:53:04.752	2026-05-31 12:53:04.752	35.0000	2025-10-15 00:00:00	\N	1050.52	600.30	18.0000	HEALTH	STAR Health	2025-09-25 00:00:00	YEARLY	\N	ACTIVE	116.73	10.0000	\N	\N	\N	\N	f	\N	2026-09-25 00:00:00
17	Care Heart	Raguvaran M	9791843406	59606544	2026-09-28 00:00:00	16354.00	16354.00	4088.50	Others	\N	BG011	2025-11-24 00:00:00	1	2026-05-31 12:53:04.758	2026-05-31 12:53:04.758	25.0000	\N	\N	3679.65	2943.72	18.0000	HEALTH	Care health	2025-09-28 00:00:00	YEARLY	\N	ACTIVE	408.85	10.0000	\N	\N	\N	\N	f	\N	2026-09-28 00:00:00
18	Event Insurance Policy	ROTARY DISTRICT 3234	\N	4038/411057967/00/000	2026-10-05 00:00:00	34221.00	29001.00	0.00	Ranga	ONLINE	BG010	2025-11-24 00:00:00	1	2026-05-31 12:53:04.765	2026-05-31 12:53:04.765	0.0000	2025-12-20 00:00:00	\N	0.00	5220.18	18.0000	COMMERCIAL	ICICI Lombard	2025-10-05 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-10-05 00:00:00
19	OD+TP	Senthil Manickam	9677061359	3005/O/411564935/00/000	2026-10-10 00:00:00	1084.00	919.00	0.00	Leadership	ONLINE	BG010	2025-11-24 00:00:00	1	2026-05-31 12:53:04.77	2026-05-31 12:53:04.77	0.0000	2025-12-20 00:00:00	\N	0.00	165.42	18.0000	MOTOR	ICICI Lombard	2025-10-10 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-10-10 00:00:00
20	I Protect Smart Plus	Dr Bama	9841177358	K6819292	2026-04-24 00:00:00	47109.00	47109.00	0.00	Others	ONLINE	BG008	2025-10-30 00:00:00	1	2026-05-31 12:53:04.777	2026-05-31 12:53:04.777	0.0000	2025-10-27 00:00:00	\N	0.00	8479.62	18.0000	LIFE	ICICI Pru Life	2025-10-24 00:00:00	HALF_YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-04-24 00:00:00
21	I Protect Smart Plus	Pragadeesh	9710498366	K6909858	2026-10-05 00:00:00	7330.00	7330.00	4031.50	Shalini D	ONLINE	BG008	2025-10-30 00:00:00	1	2026-05-31 12:53:04.784	2026-05-31 12:53:04.784	55.0000	2025-10-13 00:00:00	\N	3628.35	1319.40	18.0000	LIFE	ICICI Pru Life	2025-10-05 00:00:00	YEARLY	\N	ACTIVE	403.15	10.0000	\N	\N	\N	\N	f	\N	2026-10-05 00:00:00
22	Health Assure	Sethurama Subbu	9940455638	3920112600036759	2026-10-03 00:00:00	59739.00	59739.00	20908.65	Pandiyan	ONLINE	BG009	2025-11-24 00:00:00	1	2026-05-31 12:53:04.79	2026-05-31 12:53:04.79	35.0000	2025-12-04 00:00:00	\N	18817.79	10753.02	18.0000	HEALTH	STAR Health	2025-10-03 00:00:00	YEARLY	\N	ACTIVE	2090.86	10.0000	\N	\N	\N	\N	f	\N	2026-10-03 00:00:00
23	Health Assure	Surya Prakash	9043589516	3498112600058798	2026-10-08 00:00:00	38254.00	38254.00	13388.90	Pandiyan	ONLINE	BG009	2025-11-24 00:00:00	1	2026-05-31 12:53:04.797	2026-05-31 12:53:04.797	35.0000	2025-12-04 00:00:00	\N	12050.01	6885.72	18.0000	HEALTH	STAR Health	2025-10-08 00:00:00	YEARLY	\N	ACTIVE	1338.89	10.0000	\N	\N	\N	\N	f	\N	2026-10-08 00:00:00
24	Health Assure	SMITH PAULRAJ	9566107385	4768112600087541	2026-10-14 00:00:00	13842.00	13842.00	4844.70	Pandiyan	ONLINE	BG009	2025-11-24 00:00:00	1	2026-05-31 12:53:04.803	2026-05-31 12:53:04.803	35.0000	2025-12-04 00:00:00	\N	4360.23	2491.56	18.0000	HEALTH	STAR Health	2025-10-14 00:00:00	YEARLY	\N	ACTIVE	484.47	10.0000	\N	\N	\N	\N	f	\N	2026-10-14 00:00:00
25	Women Care	ROSHINI P	9176367763	2332112600031189	2026-10-17 00:00:00	12740.00	12740.00	4459.00	Shalini D	BNPL	BG009	2025-11-24 00:00:00	1	2026-05-31 12:53:04.809	2026-05-31 12:53:04.809	35.0000	2025-12-04 00:00:00	\N	4013.10	2293.20	18.0000	HEALTH	STAR Health	2025-10-17 00:00:00	YEARLY	\N	ACTIVE	445.90	10.0000	\N	\N	\N	\N	f	\N	2026-10-17 00:00:00
26	Health Assure	LOKHASUDHAN	9962782824	7786112600009264	2026-10-23 00:00:00	34236.00	34236.00	11982.60	Pandiyan	ONLINE	BG009	2025-11-24 00:00:00	1	2026-05-31 12:53:04.815	2026-05-31 12:53:04.815	35.0000	2025-12-04 00:00:00	\N	10784.34	6162.48	18.0000	HEALTH	STAR Health	2025-10-23 00:00:00	YEARLY	\N	ACTIVE	1198.26	10.0000	\N	\N	\N	\N	f	\N	2026-10-23 00:00:00
27	Health Assure	PREMKUMAR S	9940116092	3214112600024734	2026-10-29 00:00:00	18738.00	18738.00	6558.30	Aruna Devi	ONLINE	BG009	2025-11-24 00:00:00	1	2026-05-31 12:53:04.822	2026-05-31 12:53:04.822	35.0000	2025-12-04 00:00:00	\N	5902.47	3372.84	18.0000	HEALTH	STAR Health	2025-10-29 00:00:00	YEARLY	\N	ACTIVE	655.83	10.0000	\N	\N	\N	\N	f	\N	2026-10-29 00:00:00
28	OD+PA+TP	Nireshkumar	9499962740	1708003125P110819908	2026-10-06 00:00:00	1665.00	1411.00	0.00	Shalini D	ONLINE	BG012	2025-11-24 00:00:00	1	2026-05-31 12:53:04.828	2026-05-31 12:53:04.828	0.0000	2025-12-15 00:00:00	\N	0.00	253.98	18.0000	MOTOR	United India Ins	2025-10-06 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-10-06 00:00:00
29	Care Supreme	SUDHANYA LOGANATHAN	9551191650	20903827	2026-10-22 00:00:00	18310.00	18310.00	4577.50	Sugitha	ONLINE	BG011	2025-11-24 00:00:00	1	2026-05-31 12:53:04.835	2026-05-31 12:53:04.835	25.0000	2026-01-06 00:00:00	\N	4119.75	3295.80	18.0000	HEALTH	Care health	2025-10-22 00:00:00	YEARLY	\N	ACTIVE	457.75	10.0000	\N	\N	\N	\N	f	\N	2026-10-22 00:00:00
30	Care Heart	LOGANATHAN J	8122973763	20902962	2026-10-23 00:00:00	26248.00	26248.00	0.00	Sugitha	ONLINE	BG011	2025-11-24 00:00:00	1	2026-05-31 12:53:04.841	2026-05-31 12:53:04.841	0.0000	2026-01-06 00:00:00	\N	0.00	4724.64	18.0000	HEALTH	Care health	2025-10-23 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-10-23 00:00:00
31	Care Supreme	ARUN T	8098755941	21053852	2026-10-25 00:00:00	19891.00	19891.00	4972.75	Aruna Devi	ONLINE	BG011	2025-11-24 00:00:00	1	2026-05-31 12:53:04.848	2026-05-31 12:53:04.848	25.0000	2026-01-06 00:00:00	\N	4475.47	3580.38	18.0000	HEALTH	Care health	2025-10-25 00:00:00	YEARLY	\N	ACTIVE	497.28	10.0000	\N	\N	\N	\N	f	\N	2026-10-25 00:00:00
32	Health Assure	VELLIANGIRI	9965547676	9623112600002909	2026-11-04 00:00:00	25374.00	25374.00	8880.90	Aruna Devi	FINSALL	BG014	2025-12-12 00:00:00	1	2026-05-31 12:53:04.856	2026-05-31 12:53:04.856	35.0000	2025-12-17 00:00:00	\N	7992.81	4567.32	18.0000	HEALTH	STAR Health	2025-11-04 00:00:00	YEARLY	\N	ACTIVE	888.09	10.0000	\N	\N	\N	\N	f	\N	2026-11-04 00:00:00
33	Health Assure	MURALI RANGAN	9940338542	6560112600090155	2026-11-19 00:00:00	22478.00	22478.00	7867.30	Shalini D	FINSALL	BG014	2025-12-12 00:00:00	1	2026-05-31 12:53:04.862	2026-05-31 12:53:04.862	35.0000	2025-12-17 00:00:00	\N	7080.57	4046.04	18.0000	HEALTH	STAR Health	2025-11-19 00:00:00	YEARLY	\N	ACTIVE	786.73	10.0000	\N	\N	\N	\N	f	\N	2026-11-19 00:00:00
34	Health Assure	VELMURUGAN A	9840849514	3738112600021668	2026-11-20 00:00:00	32986.00	32986.00	11545.10	Aruna Devi	FIBE	BG014	2025-12-12 00:00:00	1	2026-05-31 12:53:04.869	2026-05-31 12:53:04.869	35.0000	2025-12-17 00:00:00	\N	10390.59	5937.48	18.0000	HEALTH	STAR Health	2025-11-20 00:00:00	YEARLY	\N	ACTIVE	1154.51	10.0000	\N	\N	\N	\N	f	\N	2026-11-20 00:00:00
35	Koti Suraksha	DINESH	9789046089	3317207917653900000	2026-11-21 00:00:00	5535.00	5535.00	0.00	Shalini D	UPI	BG015	2025-12-15 00:00:00	1	2026-05-31 12:53:04.875	2026-05-31 12:53:04.875	0.0000	2025-12-24 00:00:00	\N	0.00	996.30	18.0000	GENERAL	HDFC ERGO	2025-11-21 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-11-21 00:00:00
37	Family Shield PA	NAVEEN SENGUTTUVAN	9360454839	4172/417729912/00/000	2026-11-21 00:00:00	858.00	858.00	102.96	Ranga	CARD	BG016	2025-12-19 00:00:00	1	2026-05-31 12:53:04.892	2026-05-31 12:53:04.892	12.0000	2026-02-10 00:00:00	\N	92.66	154.44	18.0000	GENERAL	ICICI Lombard	2025-11-21 00:00:00	YEARLY	\N	ACTIVE	10.30	10.0000	\N	\N	\N	\N	f	\N	2026-11-21 00:00:00
38	Women Care	VARADHARAJAN	8248913500	7464112600024370	2026-11-25 00:00:00	22925.00	22925.00	8023.75	Pandiyan	CC	BG014	2025-12-12 00:00:00	1	2026-05-31 12:53:04.899	2026-05-31 12:53:04.899	35.0000	2025-12-17 00:00:00	\N	7221.37	4126.50	18.0000	HEALTH	STAR Health	2025-11-25 00:00:00	YEARLY	\N	ACTIVE	802.38	10.0000	\N	\N	\N	\N	f	\N	2026-11-25 00:00:00
39	Comprehensive	PANBALAN	9443613753	5137112600051936	2026-11-30 00:00:00	30424.00	30424.00	10648.40	Aruna Devi	BIMAPAY	BG014	2025-12-12 00:00:00	1	2026-05-31 12:53:04.906	2026-05-31 12:53:04.906	35.0000	2025-12-17 00:00:00	\N	9583.56	5476.32	18.0000	HEALTH	STAR Health	2025-11-30 00:00:00	YEARLY	\N	ACTIVE	1064.84	10.0000	\N	\N	\N	\N	f	\N	2026-11-30 00:00:00
40	Health Assure	SATHISH RAVI	9840762345	6198112600035372	2026-11-29 00:00:00	24847.00	24847.00	8696.45	Pandiyan	UPI	BG014	2025-12-12 00:00:00	1	2026-05-31 12:53:04.914	2026-05-31 12:53:04.914	35.0000	2025-12-17 00:00:00	\N	7826.80	4472.46	18.0000	HEALTH	STAR Health	2025-11-29 00:00:00	YEARLY	\N	ACTIVE	869.65	10.0000	\N	\N	\N	\N	f	\N	2026-11-29 00:00:00
41	OD	KANCHANA BHARATHI	9677918824	1708003125P113706460	2026-12-08 00:00:00	17717.00	15015.00	0.00	Leadership	ONLINE	BG013	2025-12-12 00:00:00	1	2026-05-31 12:53:04.921	2026-05-31 12:53:04.921	0.0000	2025-12-15 00:00:00	\N	0.00	2702.70	18.0000	MOTOR	United India Ins	2025-12-08 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-08 00:00:00
42	TP	MARIYA DOSS D	9941704859	1708003125P113785999	2026-12-01 00:00:00	842.00	714.00	0.00	Shalini D	ONLINE	BG021	2026-01-16 00:00:00	1	2026-05-31 12:53:04.929	2026-05-31 12:53:04.929	0.0000	2026-02-16 00:00:00	\N	0.00	128.52	18.0000	TRAVEL	United India Ins	2025-12-01 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-01 00:00:00
43	OD+TP	SRIDEVI CHANDRASEKAR	9003102617	1708003125P113916260	2026-12-03 00:00:00	8240.00	6983.00	1047.45	Madhesh	ONLINE	BG021	2026-01-16 00:00:00	1	2026-05-31 12:53:04.936	2026-05-31 12:53:04.936	15.0000	2026-02-16 00:00:00	\N	942.70	1256.94	18.0000	MOTOR	United India Ins	2025-12-03 00:00:00	YEARLY	\N	ACTIVE	104.75	10.0000	\N	\N	\N	\N	f	\N	2026-12-03 00:00:00
44	Star Health Assure	SELVI P	9150866952	8092112600053422	2026-12-05 00:00:00	50725.00	50725.00	17753.75	Shalini D	BNPL	BG019	2026-01-16 00:00:00	1	2026-05-31 12:53:04.943	2026-05-31 12:53:04.943	35.0000	2026-01-20 00:00:00	\N	15978.37	9130.50	18.0000	HEALTH	STAR Health	2025-12-05 00:00:00	YEARLY	3 Year Premium	ACTIVE	1775.38	10.0000	\N	\N	\N	\N	f	\N	2026-12-05 00:00:00
45	Star Health Assure	SARAVANAN S	7200148793	7704112600009331	2026-12-07 00:00:00	20157.00	20157.00	7054.95	Aruna Devi	BNPL	BG019	2026-01-16 00:00:00	1	2026-05-31 12:53:04.95	2026-05-31 12:53:04.95	35.0000	2026-01-20 00:00:00	\N	6349.45	3628.26	18.0000	HEALTH	STAR Health	2025-12-07 00:00:00	YEARLY	\N	ACTIVE	705.50	10.0000	\N	\N	\N	\N	f	\N	2026-12-07 00:00:00
46	Care Supreme	POOVIZHI K	9159609285	24118241	2026-12-10 00:00:00	33945.00	33945.00	11880.75	Pandiyan	ONLINE	BG023	\N	1	2026-05-31 12:53:04.957	2026-05-31 12:53:04.957	35.0000	2026-02-26 00:00:00	\N	10692.67	6110.10	18.0000	HEALTH	Care health	2025-12-10 00:00:00	YEARLY	\N	ACTIVE	1188.08	10.0000	\N	\N	\N	\N	f	\N	2026-12-10 00:00:00
47	OD+TP PVT CAR	UMA S BHASKARAN	9811812347	1708003125P114312408	2026-12-12 00:00:00	11502.00	9747.00	0.00	Leadership	ONLINE	BG021	2026-01-16 00:00:00	1	2026-05-31 12:53:04.965	2026-05-31 12:53:04.965	0.0000	2026-02-16 00:00:00	\N	0.00	1754.46	18.0000	MOTOR	United India Ins	2025-12-12 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-12 00:00:00
48	Full Package Fascino BSIV	SARAVANAN V	9042546656	1708003125P114369876	2026-12-13 00:00:00	1320.00	1118.00	0.00	Shalini D	ONLINE	BG021	2026-01-16 00:00:00	1	2026-05-31 12:53:04.972	2026-05-31 12:53:04.972	0.0000	2026-02-16 00:00:00	\N	0.00	201.24	18.0000	MOTOR	United India Ins	2025-12-13 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-13 00:00:00
49	Full Package Splender	SATHISH A	8248318845	1708003125P114386501	2026-12-13 00:00:00	1400.00	1186.00	0.00	Aruna Devi	ONLINE	BG021	2026-01-16 00:00:00	1	2026-05-31 12:53:04.979	2026-05-31 12:53:04.979	0.0000	2026-02-16 00:00:00	\N	0.00	213.48	18.0000	MOTOR	United India Ins	2025-12-13 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-13 00:00:00
50	Super Star Preferred	MANOJKUMAR	7448475179	2606112600003492	2026-12-13 00:00:00	7619.00	7619.00	2666.65	Shalini D	ONLINE	BG019	2026-01-16 00:00:00	1	2026-05-31 12:53:04.987	2026-05-31 12:53:04.987	35.0000	2026-01-20 00:00:00	\N	2399.98	1371.42	18.0000	HEALTH	STAR Health	2025-12-13 00:00:00	YEARLY	\N	ACTIVE	266.67	10.0000	\N	\N	\N	\N	f	\N	2026-12-13 00:00:00
51	Super Star Preferred	SIVASAKTHI S	9944923420	2569112600067224	2026-12-16 00:00:00	28645.00	28645.00	10025.75	Pandiyan	ONLINE	BG019	2026-01-16 00:00:00	1	2026-05-31 12:53:04.993	2026-05-31 12:53:04.993	35.0000	2026-01-20 00:00:00	\N	9023.17	5156.10	18.0000	HEALTH	STAR Health	2025-12-16 00:00:00	YEARLY	\N	ACTIVE	1002.58	10.0000	\N	\N	\N	\N	f	\N	2026-12-16 00:00:00
52	Trip Secure Single Trip	GURUMURTHY GOMPALAHALLY	9842417171	4233/421405302/00/000	2026-12-17 00:00:00	1116.00	1116.00	283.69	Eashwar	ONLINE	BG025	2026-02-09 00:00:00	1	2026-05-31 12:53:05	2026-05-31 12:53:05	25.4200	2026-02-18 00:00:00	\N	255.32	200.88	18.0000	TRAVEL	ICICI Lombard	2025-12-17 00:00:00	YEARLY	\N	ACTIVE	28.37	10.0000	\N	\N	\N	\N	f	\N	2026-12-17 00:00:00
53	Trip Secure Single Trip	MINAL DAYANAND PRABHU	9842417171	4233/421406235/00/000	2026-12-17 00:00:00	1116.00	1116.00	283.69	Eashwar	ONLINE	BG025	2026-02-09 00:00:00	1	2026-05-31 12:53:05.007	2026-05-31 12:53:05.007	25.4200	2026-02-18 00:00:00	\N	255.32	200.88	18.0000	TRAVEL	ICICI Lombard	2025-12-17 00:00:00	YEARLY	\N	ACTIVE	28.37	10.0000	\N	\N	\N	\N	f	\N	2026-12-17 00:00:00
54	Trip Secure Single Trip	JAYARAM KIKKERI SURYANARAYANA	9842417171	4233/421119396/00/000	2026-12-17 00:00:00	792.00	792.00	201.33	Eashwar	ONLINE	BG020	2026-01-16 00:00:00	1	2026-05-31 12:53:05.027	2026-05-31 12:53:05.027	25.4200	2026-01-20 00:00:00	\N	181.20	142.56	18.0000	TRAVEL	ICICI Lombard	2025-12-17 00:00:00	YEARLY	\N	ACTIVE	20.13	10.0000	\N	\N	\N	\N	f	\N	2026-12-17 00:00:00
55	Trip Secure Single Trip	SRINIDHI MATHUR	9842417171	4233/421395465/00/000	2026-12-17 00:00:00	771.00	771.00	195.99	Eashwar	ONLINE	BG025	2026-02-09 00:00:00	1	2026-05-31 12:53:05.033	2026-05-31 12:53:05.033	25.4200	2026-02-18 00:00:00	\N	176.39	138.78	18.0000	TRAVEL	ICICI Lombard	2025-12-17 00:00:00	YEARLY	\N	ACTIVE	19.60	10.0000	\N	\N	\N	\N	f	\N	2026-12-17 00:00:00
56	Trip Secure Single Trip	BALASUBRAMANIYAM	9842417171	4233/421398016/00/000	2026-12-17 00:00:00	792.00	792.00	201.33	Eashwar	ONLINE	BG025	2026-02-09 00:00:00	1	2026-05-31 12:53:05.039	2026-05-31 12:53:05.039	25.4200	2026-02-18 00:00:00	\N	181.20	142.56	18.0000	TRAVEL	ICICI Lombard	2025-12-17 00:00:00	YEARLY	\N	ACTIVE	20.13	10.0000	\N	\N	\N	\N	f	\N	2026-12-17 00:00:00
57	Trip Secure Single Trip	GAYATHRI SRIRAM	9842417171	4233/421399094/00/000	2026-12-17 00:00:00	792.00	792.00	201.33	Eashwar	ONLINE	BG025	2026-02-09 00:00:00	1	2026-05-31 12:53:05.046	2026-05-31 12:53:05.046	25.4200	2026-02-18 00:00:00	\N	181.20	142.56	18.0000	TRAVEL	ICICI Lombard	2025-12-17 00:00:00	YEARLY	\N	ACTIVE	20.13	10.0000	\N	\N	\N	\N	f	\N	2026-12-17 00:00:00
58	Chola Flexi Super Topup Gold	ELIZABETH	764245485	190000029440674	2026-12-17 00:00:00	12847.00	12847.00	0.00	Madhesh	ONLINE	BG027	2026-02-16 00:00:00	1	2026-05-31 12:53:05.052	2026-05-31 12:53:05.052	0.0000	2026-02-17 00:00:00	\N	0.00	2312.46	18.0000	HEALTH	Cholamandalam	2025-12-17 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-17 00:00:00
59	Elevate	SRIDHAR S	9840707564	100034391600	2026-12-20 00:00:00	29481.00	29481.00	0.00	Leadership	ONLINE	BG020	2026-01-16 00:00:00	1	2026-05-31 12:53:05.06	2026-05-31 12:53:05.06	0.0000	2026-01-20 00:00:00	\N	0.00	5306.58	18.0000	HEALTH	ICICI Lombard	2025-12-20 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-20 00:00:00
60	Activate Booster Topup	SRIDHAR S	9840707564	100035075700	2026-12-20 00:00:00	6364.00	6364.00	0.00	Leadership	ONLINE	BG020	2026-01-16 00:00:00	1	2026-05-31 12:53:05.067	2026-05-31 12:53:05.067	0.0000	2026-01-20 00:00:00	\N	0.00	1145.52	18.0000	HEALTH	ICICI Lombard	2025-12-20 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-20 00:00:00
62	PVT CAR TP	PARAMASIVAM J	7358429467	1708003125P114921811	2026-12-24 00:00:00	4090.00	3466.00	0.00	Pandiyan	ONLINE	BG021	2026-01-16 00:00:00	1	2026-05-31 12:53:05.081	2026-05-31 12:53:05.081	0.0000	2026-02-16 00:00:00	\N	0.00	623.88	18.0000	MOTOR	United India Ins	2025-12-24 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-24 00:00:00
63	Optima Secure	OVIYA ELANGO	9600136636	2800000015616500000	2026-12-26 00:00:00	95068.00	95068.00	0.00	Leadership	CHEQUE	BG022	2026-01-16 00:00:00	1	2026-05-31 12:53:05.088	2026-05-31 12:53:05.088	0.0000	2026-02-04 00:00:00	\N	0.00	17112.24	18.0000	HEALTH	HDFC ERGO	2025-12-26 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-26 00:00:00
64	Super Star Preferred	ROBERT SAMUEL	7305634969	6954112600069431	2026-12-27 00:00:00	7746.00	7746.00	0.00	Shalini D	BNPL	BG019	2026-01-16 00:00:00	1	2026-05-31 12:53:05.095	2026-05-31 12:53:05.095	0.0000	2026-01-20 00:00:00	\N	0.00	1394.28	18.0000	HEALTH	STAR Health	2025-12-27 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-27 00:00:00
65	Activate Booster Topup	GEETHA R	9840090244	100036094700	2026-12-29 00:00:00	4029.00	4029.00	0.00	Madhesh	ONLINE	BG020	2026-01-16 00:00:00	1	2026-05-31 12:53:05.102	2026-05-31 12:53:05.102	0.0000	2026-01-20 00:00:00	\N	0.00	725.22	18.0000	HEALTH	ICICI Lombard	2025-12-29 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-29 00:00:00
66	Elevate	SRIDHARAN VILVA KUMAR	9962561333	100036374200	2026-12-30 00:00:00	216495.00	216495.00	0.00	Leadership	ONLINE	BG020	2026-01-16 00:00:00	1	2026-05-31 12:53:05.108	2026-05-31 12:53:05.108	0.0000	2026-01-20 00:00:00	\N	0.00	38969.10	18.0000	HEALTH	ICICI Lombard	2025-12-30 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-30 00:00:00
67	Activate Booster Topup	SRIDHARAN VILVA KUMAR	9962561333	100036492400	2026-12-31 00:00:00	4274.00	4274.00	0.00	Leadership	ONLINE	BG020	2026-01-16 00:00:00	1	2026-05-31 12:53:05.115	2026-05-31 12:53:05.115	0.0000	2026-01-20 00:00:00	\N	0.00	769.32	18.0000	HEALTH	ICICI Lombard	2025-12-31 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-31 00:00:00
68	Trip Secure Single Trip	SUVIN PRASAD MANI	\N	4233/423237310/00/000	2026-12-31 00:00:00	516.00	516.00	131.17	Eashwar	ONLINE	BG025	2026-02-09 00:00:00	1	2026-05-31 12:53:05.121	2026-05-31 12:53:05.121	25.4200	2026-02-18 00:00:00	\N	118.05	92.88	18.0000	TRAVEL	ICICI Lombard	2025-12-31 00:00:00	YEARLY	\N	ACTIVE	13.12	10.0000	\N	\N	\N	\N	f	\N	2026-12-31 00:00:00
69	Risk Policy	MOGESH V	\N	4172/423240326/00/000	2026-12-31 00:00:00	858.00	858.00	0.00	Pandiyan	ONLINE	BG020	2026-01-16 00:00:00	1	2026-05-31 12:53:05.128	2026-05-31 12:53:05.128	0.0000	2026-01-20 00:00:00	\N	0.00	154.44	18.0000	GENERAL	ICICI Lombard	2025-12-31 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-31 00:00:00
70	Risk Policy	SANJAY V	\N	4172/423242477/00/000	2026-12-31 00:00:00	858.00	858.00	0.00	Pandiyan	ONLINE	BG020	2026-01-16 00:00:00	1	2026-05-31 12:53:05.134	2026-05-31 12:53:05.134	0.0000	2026-01-20 00:00:00	\N	0.00	154.44	18.0000	GENERAL	ICICI Lombard	2025-12-31 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-31 00:00:00
71	Trip Secure Single Trip	SRIDHARAN VILVA KUMAR	9962561333	4233/422150699/00/000	2026-12-24 00:00:00	2479.00	2479.00	0.00	Leadership	ONLINE	BG020	2026-01-16 00:00:00	1	2026-05-31 12:53:05.141	2026-05-31 12:53:05.141	0.0000	2026-01-20 00:00:00	\N	0.00	446.22	18.0000	TRAVEL	ICICI Lombard	2025-12-24 00:00:00	YEARLY	\N	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-12-24 00:00:00
72	PVT CAR Full Cover	MADHESHWARAN	9884432923	1708003125P115430293	2027-01-03 00:00:00	13658.00	11574.00	682.87	Madhesh	\N	BG028	2026-02-16 00:00:00	1	2026-05-31 12:53:05.147	2026-05-31 12:53:05.147	5.9000	2026-03-06 00:00:00	\N	614.58	2083.32	18.0000	MOTOR	United India Ins	2026-01-03 00:00:00	YEARLY	FRESH	ACTIVE	68.29	10.0000	\N	\N	\N	\N	f	\N	2027-01-03 00:00:00
73	Health Koti Suraksha Risk	MUTHUKUMAR	9444542443	3317208066873500000	2027-01-06 00:00:00	5535.00	5535.00	1660.50	Aruna Devi	\N	BG024	2026-02-09 00:00:00	1	2026-05-31 12:53:05.154	2026-05-31 12:53:05.154	30.0000	\N	\N	1494.45	996.30	18.0000	HEALTH	HDFC ERGO	2026-01-06 00:00:00	YEARLY	FRESH	ACTIVE	166.05	10.0000	\N	\N	\N	\N	f	\N	2027-01-06 00:00:00
74	Star Health Assure	REVATHI DINESHKUMAR	8056605403	2176112600015177	2027-01-07 00:00:00	51913.00	51913.00	0.00	Pandiyan	\N	BG026	2026-02-12 00:00:00	1	2026-05-31 12:53:05.16	2026-05-31 12:53:05.16	0.0000	2026-02-13 00:00:00	\N	0.00	9344.34	18.0000	HEALTH	STAR Health	2026-01-07 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-01-07 00:00:00
75	Optima Secure	SITHUKKANNAN	9600301909	2800000017246600000	2027-01-07 00:00:00	86176.00	86176.00	18958.72	Ramaraj	\N	BG024	2026-02-09 00:00:00	1	2026-05-31 12:53:05.166	2026-05-31 12:53:05.166	22.0000	\N	\N	17062.85	15511.68	18.0000	HEALTH	HDFC ERGO	2026-01-07 00:00:00	YEARLY	FRESH	ACTIVE	1895.87	10.0000	\N	\N	\N	\N	f	\N	2027-01-07 00:00:00
76	Activate Booster	P ELANGO	9971494063	100038248300	2027-01-07 00:00:00	58441.00	58441.00	0.00	Leadership	\N	BG025	2026-02-09 00:00:00	1	2026-05-31 12:53:05.173	2026-05-31 12:53:05.173	0.0000	2026-02-18 00:00:00	\N	0.00	10519.38	18.0000	HEALTH	ICICI Lombard	2026-01-07 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-01-07 00:00:00
77	PVT CAR TP	SELVARAJ	8220811548	1708003125P115936154	2027-01-12 00:00:00	4090.00	3466.00	173.30	Siva	\N	\N	\N	1	2026-05-31 12:53:05.179	2026-05-31 12:53:05.179	5.0000	\N	\N	155.97	623.88	18.0000	MOTOR	United India Ins	2026-01-12 00:00:00	YEARLY	FRESH	ACTIVE	17.33	10.0000	\N	\N	\N	\N	f	\N	2027-01-12 00:00:00
78	Activate Booster	VEER GANESH	9003010251	100038795500	2027-01-12 00:00:00	4599.00	4599.00	0.00	Madhesh	\N	BG025	2026-02-09 00:00:00	1	2026-05-31 12:53:05.186	2026-05-31 12:53:05.186	0.0000	2026-02-18 00:00:00	\N	0.00	827.82	18.0000	HEALTH	ICICI Lombard	2026-01-12 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-01-12 00:00:00
79	Optima Secure	RANJITH SRINIVASAN	9841421221	2800000017684300000	2027-01-13 00:00:00	74235.00	74235.00	22270.50	Leadership	\N	BG024	2026-02-09 00:00:00	1	2026-05-31 12:53:05.192	2026-05-31 12:53:05.192	30.0000	\N	\N	20043.45	13362.30	18.0000	HEALTH	HDFC ERGO	2026-01-13 00:00:00	YEARLY	FRESH	ACTIVE	2227.05	10.0000	\N	\N	\N	\N	f	\N	2027-01-13 00:00:00
80	Star Comprehensive Plan	NIRANJALI K	9659402464	3427112600095492	2027-01-23 00:00:00	78007.00	78007.00	0.00	Leadership	\N	BG026	2026-02-12 00:00:00	1	2026-05-31 12:53:05.199	2026-05-31 12:53:05.199	0.0000	2026-02-13 00:00:00	\N	0.00	14041.26	18.0000	HEALTH	STAR Health	2026-01-23 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-01-23 00:00:00
81	Activate Booster	SUDAKARAN J	9444302807	100041455600	2027-01-25 00:00:00	7796.00	7796.00	0.00	Leadership	\N	BG025	2026-02-09 00:00:00	1	2026-05-31 12:53:05.205	2026-05-31 12:53:05.205	0.0000	2026-02-18 00:00:00	\N	0.00	1403.28	18.0000	HEALTH	ICICI Lombard	2026-01-25 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-01-25 00:00:00
82	Optima Secure Super Secure	SUGANYA	8050143184	2800000019216100000	2027-01-28 00:00:00	49051.00	49051.00	12262.75	Leadership	\N	BG024	2026-02-09 00:00:00	1	2026-05-31 12:53:05.211	2026-05-31 12:53:05.211	25.0000	\N	\N	11036.47	8829.18	18.0000	HEALTH	HDFC ERGO	2026-01-28 00:00:00	YEARLY	FRESH	ACTIVE	1226.28	10.0000	\N	\N	\N	\N	f	\N	2027-01-28 00:00:00
83	Optima Secure	GUNASEKARAN	9442635374	2800000019444200000	2027-01-29 00:00:00	26472.00	26472.00	4500.24	Leadership	\N	BG024	2026-02-09 00:00:00	1	2026-05-31 12:53:05.218	2026-05-31 12:53:05.218	17.0000	\N	\N	4050.22	4764.96	18.0000	HEALTH	HDFC ERGO	2026-01-29 00:00:00	YEARLY	FRESH	ACTIVE	450.02	10.0000	\N	\N	\N	\N	f	\N	2027-01-29 00:00:00
84	Elevate	HARISH BABU	7010400530	100042250500	2027-01-29 00:00:00	39845.00	39845.00	0.00	Aruna Devi	\N	BG025	2026-02-09 00:00:00	1	2026-05-31 12:53:05.224	2026-05-31 12:53:05.224	0.0000	2026-02-18 00:00:00	\N	0.00	7172.10	18.0000	HEALTH	ICICI Lombard	2026-01-29 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-01-29 00:00:00
85	OPD Secure 5K	HARISH BABU	7010400530	100043305700	2027-01-29 00:00:00	2100.00	2100.00	138.18	Aruna Devi	\N	BG029	2026-03-09 00:00:00	1	2026-05-31 12:53:05.23	2026-05-31 12:53:05.23	6.5800	\N	\N	124.36	378.00	18.0000	HEALTH	ICICI Lombard	2026-01-29 00:00:00	YEARLY	FRESH	ACTIVE	13.82	10.0000	\N	\N	\N	\N	f	\N	2027-01-29 00:00:00
86	Optima Secure	SELVA MUTHU KUMARAN	6380350477	28000000019603000000	2027-01-31 00:00:00	45234.00	45234.00	7689.78	Leadership	\N	BG024	2026-02-09 00:00:00	1	2026-05-31 12:53:05.237	2026-05-31 12:53:05.237	17.0000	\N	\N	6920.80	8142.12	18.0000	HEALTH	HDFC ERGO	2026-01-31 00:00:00	YEARLY	FRESH	ACTIVE	768.98	10.0000	\N	\N	\N	\N	f	\N	2027-01-31 00:00:00
87	Optima Secure	SELVA MUTHU KUMARAN	6380350477	2800000019680800000	2027-01-31 00:00:00	10210.00	10210.00	1735.70	Leadership	\N	BG024	2026-02-09 00:00:00	1	2026-05-31 12:53:05.243	2026-05-31 12:53:05.243	17.0000	\N	\N	1562.13	1837.80	18.0000	HEALTH	HDFC ERGO	2026-01-31 00:00:00	YEARLY	FRESH	ACTIVE	173.57	10.0000	\N	\N	\N	\N	f	\N	2027-01-31 00:00:00
88	Health Assure	LOKHASUDHAN	9962782824	7786112600009264-Q2	2026-04-23 00:00:00	8559.00	8559.00	2995.65	Pandiyan	\N	BG026	2026-02-12 00:00:00	1	2026-05-31 12:53:05.249	2026-05-31 12:53:05.249	35.0000	2026-02-13 00:00:00	\N	2696.08	1540.62	18.0000	HEALTH	STAR Health	2026-01-23 00:00:00	QUARTERLY	Q RENEW	ACTIVE	299.57	10.0000	\N	\N	\N	\N	f	\N	2026-04-23 00:00:00
89	TP+PA	AFROSE	8438234144	1708003125P117171243	2027-02-04 00:00:00	9377.00	7947.00	1644.23	Mahalakshmi	\N	BG030	2026-03-09 00:00:00	1	2026-05-31 12:53:05.255	2026-05-31 12:53:05.255	20.6900	\N	\N	1479.81	1430.46	18.0000	MOTOR	United India Ins	2026-02-04 00:00:00	YEARLY	FRESH	ACTIVE	164.42	10.0000	\N	\N	\N	\N	f	\N	2027-02-04 00:00:00
91	Star Assure	SIVA VIGNESH	7502124944	5355112600095220	2027-02-06 00:00:00	21672.00	21672.00	6427.92	Pandiyan	\N	BG033	2026-03-11 00:00:00	1	2026-05-31 12:53:05.268	2026-05-31 12:53:05.268	29.6600	\N	\N	5785.13	3900.96	18.0000	HEALTH	STAR Health	2026-02-06 00:00:00	YEARLY	FRESH	ACTIVE	642.79	10.0000	\N	\N	\N	\N	f	\N	2027-02-06 00:00:00
92	Elevate	KVSS SESHADRI SASTRI	9177565333	100044132900	2027-02-10 00:00:00	27212.00	27212.00	3806.96	Leadership	\N	BG029	2026-03-09 00:00:00	1	2026-05-31 12:53:05.274	2026-05-31 12:53:05.274	13.9900	\N	\N	3426.26	4898.16	18.0000	HEALTH	ICICI Lombard	2026-02-10 00:00:00	YEARLY	FRESH	ACTIVE	380.70	10.0000	\N	\N	\N	\N	f	\N	2027-02-10 00:00:00
93	Activate Booster	KVSS SESHADRI SASTRI	9177565333	100044374300	2027-02-10 00:00:00	4867.00	4867.00	680.89	Leadership	\N	BG029	2026-03-09 00:00:00	1	2026-05-31 12:53:05.281	2026-05-31 12:53:05.281	13.9900	\N	\N	612.80	876.06	18.0000	HEALTH	ICICI Lombard	2026-02-10 00:00:00	YEARLY	FRESH	ACTIVE	68.09	10.0000	\N	\N	\N	\N	f	\N	2027-02-10 00:00:00
94	TP PVT CAR	SURESH SAGADEVAN	9094967168	1708003125P117547562	2027-02-10 00:00:00	4090.00	3466.00	1386.40	Shalini D	\N	BG030	2026-03-09 00:00:00	1	2026-05-31 12:53:05.287	2026-05-31 12:53:05.287	40.0000	\N	\N	1247.76	623.88	18.0000	MOTOR	United India Ins	2026-02-10 00:00:00	YEARLY	FRESH	ACTIVE	138.64	10.0000	\N	\N	\N	\N	f	\N	2027-02-10 00:00:00
95	UBSUS Policy	KALKI IRON AND STEEL TRADERS	9842323988	1708001125P117764236	2027-02-14 00:00:00	17211.00	14586.00	2498.58	Madhesh	\N	BG030	2026-03-09 00:00:00	1	2026-05-31 12:53:05.293	2026-05-31 12:53:05.293	17.1300	\N	\N	2248.72	2625.48	18.0000	COMMERCIAL	United India Ins	2026-02-14 00:00:00	YEARLY	FRESH	ACTIVE	249.86	10.0000	\N	\N	\N	\N	f	\N	2027-02-14 00:00:00
96	Health Assure	MAHESWARI K	8939351135	8283112600008330	2027-02-16 00:00:00	35957.00	35957.00	0.00	Pandiyan	\N	BG033	2026-03-11 00:00:00	1	2026-05-31 12:53:05.299	2026-05-31 12:53:05.299	0.0000	\N	\N	0.00	6472.26	18.0000	HEALTH	STAR Health	2026-02-16 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-02-16 00:00:00
97	Elevate	JAYASANKAR	7358785228	100045542800	2027-02-16 00:00:00	26455.00	26455.00	6955.02	Leadership	\N	BG029	2026-03-09 00:00:00	1	2026-05-31 12:53:05.305	2026-05-31 12:53:05.305	26.2900	\N	\N	6259.52	4761.90	18.0000	HEALTH	ICICI Lombard	2026-02-16 00:00:00	YEARLY	FRESH	ACTIVE	695.50	10.0000	\N	\N	\N	\N	f	\N	2027-02-16 00:00:00
98	Activate Booster	JAYASANKAR	7358785228	100045807000	2027-02-16 00:00:00	5108.00	5108.00	714.61	Leadership	\N	BG029	2026-03-09 00:00:00	1	2026-05-31 12:53:05.311	2026-05-31 12:53:05.311	13.9900	\N	\N	643.15	919.44	18.0000	HEALTH	ICICI Lombard	2026-02-16 00:00:00	YEARLY	FRESH	ACTIVE	71.46	10.0000	\N	\N	\N	\N	f	\N	2027-02-16 00:00:00
99	COMM TP+PA	CHANDRAN N	9789046089	1708003125P118019179	2027-02-19 00:00:00	6941.00	5882.00	2353.39	Shalini D	\N	BG030	2026-03-09 00:00:00	1	2026-05-31 12:53:05.318	2026-05-31 12:53:05.318	40.0100	\N	\N	2118.05	1058.76	18.0000	MOTOR	United India Ins	2026-02-19 00:00:00	YEARLY	FRESH	ACTIVE	235.34	10.0000	\N	\N	\N	\N	f	\N	2027-02-19 00:00:00
100	Health Assure	ARUNADEVI B	9789430217	5798112600080916	2027-02-19 00:00:00	22477.00	22477.00	6666.68	Aruna Devi	\N	BG033	2026-03-11 00:00:00	1	2026-05-31 12:53:05.324	2026-05-31 12:53:05.324	29.6600	\N	\N	6000.01	4045.86	18.0000	HEALTH	STAR Health	2026-02-19 00:00:00	YEARLY	FRESH	ACTIVE	666.67	10.0000	\N	\N	\N	\N	f	\N	2027-02-19 00:00:00
101	OD+TP	VIJAY	8248744938	1708003125P118125463	2027-02-23 00:00:00	16280.00	13797.00	2069.55	Madhesh	\N	BG030	2026-03-09 00:00:00	1	2026-05-31 12:53:05.331	2026-05-31 12:53:05.331	15.0000	\N	\N	1862.59	2483.46	18.0000	MOTOR	United India Ins	2026-02-23 00:00:00	YEARLY	FRESH	ACTIVE	206.96	10.0000	\N	\N	\N	\N	f	\N	2027-02-23 00:00:00
102	Women Care Policy	DHARSHINI M	9003727347	3341112600022810	2027-02-25 00:00:00	12740.00	12740.00	3778.68	Pandiyan	\N	BG033	2026-03-11 00:00:00	1	2026-05-31 12:53:05.337	2026-05-31 12:53:05.337	29.6600	\N	\N	3400.81	2293.20	18.0000	HEALTH	STAR Health	2026-02-25 00:00:00	YEARLY	FRESH	ACTIVE	377.87	10.0000	\N	\N	\N	\N	f	\N	2027-02-25 00:00:00
103	Elevate	SUDAKARAN J	9444302807	100048074400	2027-02-27 00:00:00	192439.00	192439.00	53844.43	Leadership	\N	BG029	2026-03-09 00:00:00	1	2026-05-31 12:53:05.351	2026-05-31 12:53:05.351	27.9800	\N	\N	48459.99	34639.02	18.0000	HEALTH	ICICI Lombard	2026-02-27 00:00:00	YEARLY	FRESH	ACTIVE	5384.44	10.0000	\N	\N	\N	\N	f	\N	2027-02-27 00:00:00
104	Koti Suraksha	SIVASEVUGARAM	9787786124	3317208306042700000	2027-02-28 00:00:00	5535.00	5535.00	3191.48	Pandiyan	\N	BG031	2026-03-09 00:00:00	1	2026-05-31 12:53:05.358	2026-05-31 12:53:05.358	57.6600	\N	\N	2872.33	996.30	18.0000	GENERAL	HDFC ERGO	2026-02-28 00:00:00	YEARLY	FRESH	ACTIVE	319.15	10.0000	\N	\N	\N	\N	f	\N	2027-02-28 00:00:00
105	Life Time Classic	BHASKARAN RAMASAMY	9811812347	K8993183	2027-02-28 00:00:00	100000.00	100000.00	12000.00	Bhaskar	\N	BG032	2026-03-10 00:00:00	1	2026-05-31 12:53:05.365	2026-05-31 12:53:05.365	12.0000	\N	\N	10800.00	18000.00	18.0000	LIFE	ICICI Pru Life	2026-02-28 00:00:00	YEARLY	FRESH	ACTIVE	1200.00	10.0000	\N	\N	\N	\N	f	\N	2027-02-28 00:00:00
106	Full Package	GOPI S	9884220064	1708003125P118701654	2027-03-02 00:00:00	17676.00	17676.00	0.00	Shalini D	\N	BG040	2026-04-16 00:00:00	1	2026-05-31 12:53:05.372	2026-05-31 12:53:05.372	0.0000	\N	\N	0.00	3181.68	18.0000	MOTOR	United India Ins	2026-03-02 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-03-02 00:00:00
107	Health Assure	ABDULLAH BEEVI	7200408011	2066112600050352	2027-03-03 00:00:00	14166.00	14166.00	4958.10	Pandiyan	\N	BG035	2026-04-10 00:00:00	1	2026-05-31 12:53:05.38	2026-05-31 12:53:05.38	35.0000	\N	\N	4462.29	2549.88	18.0000	HEALTH	STAR Health	2026-03-03 00:00:00	YEARLY	FRESH	ACTIVE	495.81	10.0000	\N	\N	\N	\N	f	\N	2027-03-03 00:00:00
108	Optima Secure	SYED MOHAMMED	9841608011	2800000024843000000	2027-03-12 00:00:00	12764.00	12764.00	3701.56	Pandiyan	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.388	2026-05-31 12:53:05.388	29.0000	\N	\N	3331.40	2297.52	18.0000	HEALTH	HDFC ERGO	2026-03-12 00:00:00	YEARLY	FRESH	ACTIVE	370.16	10.0000	\N	\N	\N	\N	f	\N	2027-03-12 00:00:00
109	Trip Secure Plus	MATHY SAM	9381026707	4233/431542283/00/000	2027-03-03 00:00:00	736.00	736.00	220.80	Aruna Devi	\N	BG037	2026-04-10 00:00:00	1	2026-05-31 12:53:05.393	2026-05-31 12:53:05.393	30.0000	\N	\N	198.72	132.48	18.0000	TRAVEL	ICICI Lombard	2026-03-03 00:00:00	YEARLY	FRESH	ACTIVE	22.08	10.0000	\N	\N	\N	\N	f	\N	2027-03-03 00:00:00
110	TP+PA	PRIYA T	9344394622	1708003125P118755191	2027-03-03 00:00:00	1167.00	1167.00	0.00	Manikandan	\N	BG040	2026-04-16 00:00:00	1	2026-05-31 12:53:05.4	2026-05-31 12:53:05.4	0.0000	\N	\N	0.00	210.06	18.0000	MOTOR	United India Ins	2026-03-03 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-03-03 00:00:00
111	Lifetime Classic	UMA	9811812347	K9042973	2026-09-03 00:00:00	50000.00	50000.00	5000.00	Bhaskar	\N	BG038	2026-04-11 00:00:00	1	2026-05-31 12:53:05.406	2026-05-31 12:53:05.406	10.0000	\N	\N	4500.00	9000.00	18.0000	LIFE	ICICI Pru Life	2026-03-03 00:00:00	HALF_YEARLY	FRESH	ACTIVE	500.00	10.0000	\N	\N	\N	\N	f	\N	2026-09-03 00:00:00
112	Super Star	SIVAKUMAR DURAISAMY	9788629536	3839112600059339	2027-03-09 00:00:00	23548.00	23548.00	8241.80	Sivamurthy	\N	BG035	2026-04-10 00:00:00	1	2026-05-31 12:53:05.412	2026-05-31 12:53:05.412	35.0000	\N	\N	7417.62	4238.64	18.0000	HEALTH	STAR Health	2026-03-09 00:00:00	YEARLY	FRESH	ACTIVE	824.18	10.0000	\N	\N	\N	\N	f	\N	2027-03-09 00:00:00
113	Optima Secure	NEVERA	9444302807	2800000024096100000	2027-03-05 00:00:00	18486.00	18486.00	6081.89	Leadership	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.418	2026-05-31 12:53:05.418	32.9000	\N	\N	5473.70	3327.48	18.0000	HEALTH	HDFC ERGO	2026-03-05 00:00:00	YEARLY	FRESH	ACTIVE	608.19	10.0000	\N	\N	\N	\N	f	\N	2027-03-05 00:00:00
114	Motor OD	RADHAA S	9677061359	1708003125P118865659	2027-03-05 00:00:00	678.00	678.00	0.00	Leadership	\N	BG040	2026-04-16 00:00:00	1	2026-05-31 12:53:05.424	2026-05-31 12:53:05.424	0.0000	\N	\N	0.00	122.04	18.0000	MOTOR	United India Ins	2026-03-05 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-03-05 00:00:00
115	Full Package	MAHALAKSHMI	9840811947	1708003125P119146515	2027-03-10 00:00:00	15135.00	15135.00	0.00	Madhesh	\N	BG040	2026-04-16 00:00:00	1	2026-05-31 12:53:05.431	2026-05-31 12:53:05.431	0.0000	\N	\N	0.00	2724.30	18.0000	MOTOR	United India Ins	2026-03-10 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-03-10 00:00:00
116	TP+PA	PURAVALAN FRIGHT	9952027428	1708003125P118701987	2027-03-10 00:00:00	16969.00	16969.00	6787.60	Mahalakshmi	\N	BG040	2026-04-16 00:00:00	1	2026-05-31 12:53:05.437	2026-05-31 12:53:05.437	40.0000	\N	\N	6108.84	3054.42	18.0000	MOTOR	United India Ins	2026-03-10 00:00:00	YEARLY	FRESH	ACTIVE	678.76	10.0000	\N	\N	\N	\N	f	\N	2027-03-10 00:00:00
117	Women Care	SIVA MURTHY	8148437947	6862112600092246	2027-02-19 00:00:00	18460.00	18460.00	6461.00	Sivamurthy	\N	BG035	2026-04-10 00:00:00	1	2026-05-31 12:53:05.444	2026-05-31 12:53:05.444	35.0000	\N	\N	5814.90	3322.80	18.0000	HEALTH	STAR Health	2026-02-19 00:00:00	YEARLY	FRESH	ACTIVE	646.10	10.0000	\N	\N	\N	\N	f	\N	2027-02-19 00:00:00
118	Women Care	SHALINI PRABHAKARAN	9080859338	9487112600006121	2027-03-11 00:00:00	24206.00	24206.00	8472.10	Shalini D	\N	BG035	2026-04-10 00:00:00	1	2026-05-31 12:53:05.45	2026-05-31 12:53:05.45	35.0000	\N	\N	7624.89	4357.08	18.0000	HEALTH	STAR Health	2026-03-11 00:00:00	YEARLY	FRESH	ACTIVE	847.21	10.0000	\N	\N	\N	\N	f	\N	2027-03-11 00:00:00
119	Health Assure	RUCKMANI SATHYAMOORTHY	7259935734	3145112600041620	2027-03-14 00:00:00	27002.00	27002.00	9450.70	Aruna Devi	\N	BG035	2026-04-10 00:00:00	1	2026-05-31 12:53:05.456	2026-05-31 12:53:05.456	35.0000	\N	\N	8505.63	4860.36	18.0000	HEALTH	STAR Health	2026-03-14 00:00:00	YEARLY	FRESH	ACTIVE	945.07	10.0000	\N	\N	\N	\N	f	\N	2027-03-14 00:00:00
120	Elevate	VARADHARAJAN N	6248913500	100050894600	2027-03-14 00:00:00	53834.00	53834.00	15132.74	Pandiyan	\N	BG037	2026-04-10 00:00:00	1	2026-05-31 12:53:05.463	2026-05-31 12:53:05.463	28.1100	\N	\N	13619.47	9690.12	18.0000	HEALTH	ICICI Lombard	2026-03-14 00:00:00	YEARLY	FRESH	ACTIVE	1513.27	10.0000	\N	\N	\N	\N	f	\N	2027-03-14 00:00:00
121	PVT CAR Full Pack	MURUGAPPAN K	9842370120	1708003125P119533096	2027-03-16 00:00:00	16594.00	16594.00	0.00	Leadership	\N	BG040	2026-04-16 00:00:00	1	2026-05-31 12:53:05.498	2026-05-31 12:53:05.498	0.0000	\N	\N	0.00	2986.92	18.0000	MOTOR	United India Ins	2026-03-16 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-03-16 00:00:00
125	Two Wheeler	SAMY	9789052402	202603232088622	2027-03-24 00:00:00	992.00	992.00	0.00	Leadership	\N	BG040	2026-04-16 00:00:00	1	2026-05-31 12:53:05.527	2026-05-31 12:53:05.527	0.0000	\N	\N	0.00	178.56	18.0000	MOTOR	United India Ins	2026-03-24 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-03-24 00:00:00
126	Two Wheeler	SAMY	9789052402	202603231973548	2027-03-24 00:00:00	949.00	949.00	0.00	Leadership	\N	BG040	2026-04-16 00:00:00	1	2026-05-31 12:53:05.533	2026-05-31 12:53:05.533	0.0000	\N	\N	0.00	170.82	18.0000	MOTOR	United India Ins	2026-03-24 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-03-24 00:00:00
127	Women Care	SRINIVAS M	7550306261	2490112600073463	2027-03-27 00:00:00	18460.00	18460.00	6461.00	Aruna Devi	\N	BG035	2026-04-10 00:00:00	1	2026-05-31 12:53:05.539	2026-05-31 12:53:05.539	35.0000	\N	\N	5814.90	3322.80	18.0000	HEALTH	STAR Health	2026-03-27 00:00:00	YEARLY	FRESH	ACTIVE	646.10	10.0000	\N	\N	\N	\N	f	\N	2027-03-27 00:00:00
128	TP Two Wheeler	GOPIKA	8428426469	1708003125P120252933	2027-03-27 00:00:00	842.00	842.00	0.00	Shalini D	\N	BG040	2026-04-16 00:00:00	1	2026-05-31 12:53:05.55	2026-05-31 12:53:05.55	0.0000	\N	\N	0.00	151.56	18.0000	MOTOR	United India Ins	2026-03-27 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-03-27 00:00:00
129	Elevate	RITHIKA MOHAN	9865074306	100053843300	2027-03-28 00:00:00	6979.00	6979.00	1961.80	Manimehalai	\N	BG037	2026-04-10 00:00:00	1	2026-05-31 12:53:05.556	2026-05-31 12:53:05.556	28.1100	\N	\N	1765.62	1256.22	18.0000	HEALTH	ICICI Lombard	2026-03-28 00:00:00	YEARLY	FRESH	ACTIVE	196.18	10.0000	\N	\N	\N	\N	f	\N	2027-03-28 00:00:00
130	Optima Secure	BALAMURUGAN	6379615869	2800000027450400000	2027-03-28 00:00:00	26728.00	26728.00	9675.54	Shalini D	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.561	2026-05-31 12:53:05.561	36.2000	\N	\N	8707.99	4811.04	18.0000	HEALTH	HDFC ERGO	2026-03-28 00:00:00	YEARLY	FRESH	ACTIVE	967.55	10.0000	\N	\N	\N	\N	f	\N	2027-03-28 00:00:00
131	Health Assure	SENTHILKUMAR PALSAMY	9791404997	958112600018689	2027-03-29 00:00:00	19800.00	19800.00	6930.00	Aruna Devi	\N	BG035	2026-04-10 00:00:00	1	2026-05-31 12:53:05.566	2026-05-31 12:53:05.566	35.0000	\N	\N	6237.00	3564.00	18.0000	HEALTH	STAR Health	2026-03-29 00:00:00	YEARLY	FRESH	ACTIVE	693.00	10.0000	\N	\N	\N	\N	f	\N	2027-03-29 00:00:00
132	Kotti Suraksha	MELWIN RAJ M	9840234984	3317208422291000000	2027-03-30 00:00:00	5535.00	5535.00	1964.93	Leadership	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.572	2026-05-31 12:53:05.572	35.5000	\N	\N	1768.44	996.30	18.0000	GENERAL	HDFC ERGO	2026-03-30 00:00:00	YEARLY	FRESH	ACTIVE	196.49	10.0000	\N	\N	\N	\N	f	\N	2027-03-30 00:00:00
133	Kotti Suraksha	JOSEPH ARUNKUMAR DANIEL	\N	3317208423670700000	2027-03-30 00:00:00	5535.00	5535.00	1964.93	Leadership	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.577	2026-05-31 12:53:05.577	35.5000	\N	\N	1768.44	996.30	18.0000	GENERAL	HDFC ERGO	2026-03-30 00:00:00	YEARLY	FRESH	ACTIVE	196.49	10.0000	\N	\N	\N	\N	f	\N	2027-03-30 00:00:00
134	Kotti Suraksha	JEBEE JASMINE	\N	3317208422240400000	2027-03-30 00:00:00	5535.00	5535.00	1964.93	Leadership	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.581	2026-05-31 12:53:05.581	35.5000	\N	\N	1768.44	996.30	18.0000	GENERAL	HDFC ERGO	2026-03-30 00:00:00	YEARLY	FRESH	ACTIVE	196.49	10.0000	\N	\N	\N	\N	f	\N	2027-03-30 00:00:00
135	Kotti Suraksha	STEPHEN MANOJOY MONDAL	9500094751	3317208422218000000	2027-03-30 00:00:00	5535.00	5535.00	1964.93	Leadership	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.585	2026-05-31 12:53:05.585	35.5000	\N	\N	1768.44	996.30	18.0000	GENERAL	HDFC ERGO	2026-03-30 00:00:00	YEARLY	FRESH	ACTIVE	196.49	10.0000	\N	\N	\N	\N	f	\N	2027-03-30 00:00:00
136	Kotti Suraksha	BEN VIJAY STALIN JAYAKUMAR	\N	3317208422176000000	2027-03-30 00:00:00	5535.00	5535.00	1964.93	Leadership	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.589	2026-05-31 12:53:05.589	35.5000	\N	\N	1768.44	996.30	18.0000	GENERAL	HDFC ERGO	2026-03-30 00:00:00	YEARLY	FRESH	ACTIVE	196.49	10.0000	\N	\N	\N	\N	f	\N	2027-03-30 00:00:00
137	Kotti Suraksha	J DOSS	8248992576	3317208422121300000	2027-03-30 00:00:00	5535.00	5535.00	1964.93	Leadership	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.593	2026-05-31 12:53:05.593	35.5000	\N	\N	1768.44	996.30	18.0000	GENERAL	HDFC ERGO	2026-03-30 00:00:00	YEARLY	FRESH	ACTIVE	196.49	10.0000	\N	\N	\N	\N	f	\N	2027-03-30 00:00:00
138	Kotti Suraksha	JONATHAN PHILEMON PHILIP	9179222225	3317208422075400000	2027-03-30 00:00:00	5535.00	5535.00	1964.93	Leadership	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.597	2026-05-31 12:53:05.597	35.5000	\N	\N	1768.44	996.30	18.0000	GENERAL	HDFC ERGO	2026-03-30 00:00:00	YEARLY	FRESH	ACTIVE	196.49	10.0000	\N	\N	\N	\N	f	\N	2027-03-30 00:00:00
139	Optima Secure	GOPIKA KARTHIKEYAN	8220666461	2800000028185100000	2027-03-31 00:00:00	27542.00	27542.00	9970.20	Shalini D	\N	BG036	2026-04-10 00:00:00	1	2026-05-31 12:53:05.601	2026-05-31 12:53:05.601	36.2000	\N	\N	8973.18	4957.56	18.0000	HEALTH	HDFC ERGO	2026-03-31 00:00:00	YEARLY	FRESH	ACTIVE	997.02	10.0000	\N	\N	\N	\N	f	\N	2027-03-31 00:00:00
140	Optima Secure	KUMARA GURU	9894215147	28000000296245	2027-04-10 00:00:00	44510.00	44510.00	0.00	Leadership	\N	BG044	2026-05-12 00:00:00	1	2026-05-31 12:53:05.605	2026-05-31 12:53:05.605	0.0000	\N	\N	0.00	8011.80	18.0000	HEALTH	HDFC ERGO	2026-04-10 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-04-10 00:00:00
142	Health Assure	MURUGESAN G	8098431357	5290112700030086	2027-04-04 00:00:00	74575.00	74575.00	26101.25	Pandiyan	\N	BG048	2026-05-12 00:00:00	1	2026-05-31 12:53:05.613	2026-05-31 12:53:05.613	35.0000	\N	\N	23491.12	13423.50	18.0000	HEALTH	STAR Health	2026-04-04 00:00:00	YEARLY	FRESH	ACTIVE	2610.13	10.0000	\N	\N	\N	\N	f	\N	2027-04-04 00:00:00
143	Motor TP	RAJESHKANNA	9444324273	1708003126P100397955	2027-04-07 00:00:00	842.00	842.00	0.00	Aruna Devi	\N	BG043	2026-05-12 00:00:00	1	2026-05-31 12:53:05.617	2026-05-31 12:53:05.617	0.0000	\N	\N	0.00	151.56	18.0000	MOTOR	United India Ins	2026-04-07 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-04-07 00:00:00
144	Comprehensive	SRIDHAR A	9176274814	2302208442240300000	2027-04-07 00:00:00	8805.00	8805.00	0.00	Leadership	\N	BG046	2026-05-12 00:00:00	1	2026-05-31 12:53:05.621	2026-05-31 12:53:05.621	0.0000	\N	\N	0.00	1584.90	18.0000	MOTOR	HDFC ERGO	2026-04-07 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-04-07 00:00:00
145	EV Motor Comprehensive	BHASKARAN	9811812347	1708003126P100491700	2027-04-07 00:00:00	54263.00	54263.00	0.00	Bhaskar	\N	BG043	2026-05-12 00:00:00	1	2026-05-31 12:53:05.625	2026-05-31 12:53:05.625	0.0000	\N	\N	0.00	9767.34	18.0000	MOTOR	United India Ins	2026-04-07 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-04-07 00:00:00
146	TP	SRIVIDHYA D	9444044262	1708003126P100752697	2027-04-14 00:00:00	842.00	842.00	0.00	Shalini D	\N	BG043	2026-05-12 00:00:00	1	2026-05-31 12:53:05.629	2026-05-31 12:53:05.629	0.0000	\N	\N	0.00	151.56	18.0000	MOTOR	United India Ins	2026-04-14 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-04-14 00:00:00
147	Super Star Preferred	VENKATESAN G	9787138585	1499112700091371	2027-04-18 00:00:00	55354.00	55354.00	19373.90	Pandiyan	\N	BG048	2026-05-12 00:00:00	1	2026-05-31 12:53:05.633	2026-05-31 12:53:05.633	35.0000	\N	\N	17436.51	9963.72	18.0000	HEALTH	STAR Health	2026-04-18 00:00:00	YEARLY	FRESH	ACTIVE	1937.39	10.0000	\N	\N	\N	\N	f	\N	2027-04-18 00:00:00
148	Health Koti Suraksha	HARIHARAN M	9600878577	3317208506462600000	2027-04-25 00:00:00	26070.00	26070.00	0.00	Aruna Devi	\N	BG044	2026-05-12 00:00:00	1	2026-05-31 12:53:05.637	2026-05-31 12:53:05.637	0.0000	\N	\N	0.00	4692.60	18.0000	GENERAL	HDFC ERGO	2026-04-25 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-04-25 00:00:00
149	New Vehicle Comprehensive	PRABHU	9566023963	2302208509234800000	2027-04-26 00:00:00	28409.00	28409.00	0.00	Madhesh	\N	BG046	2026-05-12 00:00:00	1	2026-05-31 12:53:05.641	2026-05-31 12:53:05.641	0.0000	\N	\N	0.00	5113.62	18.0000	MOTOR	HDFC ERGO	2026-04-26 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-04-26 00:00:00
150	Package Policy	SANTHOSH KUMAR K	\N	1708003126P101630107	2027-04-30 00:00:00	7746.00	7746.00	0.00	Manikandan	\N	BG043	2026-05-12 00:00:00	1	2026-05-31 12:53:05.645	2026-05-31 12:53:05.645	0.0000	\N	\N	0.00	1394.28	18.0000	MOTOR	United India Ins	2026-04-30 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-04-30 00:00:00
151	Axis Max Term Plus	JEEVARATHINAM	8778611435	195933858	2026-05-26 00:00:00	27754.00	4625.00	0.00	Aruna Devi	\N	\N	\N	1	2026-05-31 12:53:05.653	2026-05-31 12:53:05.653	0.0000	\N	\N	0.00	832.50	18.0000	LIFE	Max Life	2026-04-26 00:00:00	MONTHLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-05-26 00:00:00
152	Sampoorna Raksha	SIVAMURTHY	8148437947	C295450326	2027-04-06 00:00:00	46974.00	46974.00	31472.58	Sivamurthy	\N	BG041	2026-04-16 00:00:00	1	2026-05-31 12:53:05.658	2026-05-31 12:53:05.658	67.0000	\N	\N	28325.32	8455.32	18.0000	LIFE	TATA AIA	2026-04-06 00:00:00	YEARLY	FRESH	ACTIVE	3147.26	10.0000	\N	\N	\N	\N	f	\N	2027-04-06 00:00:00
154	Health Assure	LOKHASUDHAN	9962782824	7786112600009264-Q3	2026-07-23 00:00:00	8599.00	8599.00	3009.65	Pandiyan	\N	BG048	2026-05-12 00:00:00	1	2026-05-31 12:53:05.667	2026-05-31 12:53:05.667	35.0000	\N	\N	2708.69	1547.82	18.0000	HEALTH	STAR Health	2026-04-23 00:00:00	QUARTERLY	Q RENEW	ACTIVE	300.96	10.0000	\N	\N	\N	\N	f	\N	2026-07-23 00:00:00
155	I Protect Smart Plus	Dr Bama	9841177358	K6819292-H2	2026-04-24 00:00:00	47109.00	47109.00	25909.95	Leadership	\N	BG042	2026-05-12 00:00:00	1	2026-05-31 12:53:05.672	2026-05-31 12:53:05.672	55.0000	\N	\N	23318.95	8479.62	18.0000	LIFE	ICICI Pru Life	2025-10-24 00:00:00	HALF_YEARLY	H RENEW	ACTIVE	2591.00	10.0000	\N	\N	\N	\N	f	\N	2026-04-24 00:00:00
156	Health Assure	GOWTHAMAN	9448029163	8879112700040512	2027-05-01 00:00:00	27385.00	27385.00	0.00	Aruna Devi	\N	\N	\N	1	2026-05-31 12:53:05.677	2026-05-31 12:53:05.677	0.0000	\N	\N	0.00	4929.30	18.0000	HEALTH	HDFC ERGO	2026-05-01 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-01 00:00:00
157	Care Supreme	GANESH	9843740606	A8573140	2027-05-01 00:00:00	66699.00	66699.00	0.00	Madhesh	\N	\N	\N	1	2026-05-31 12:53:05.681	2026-05-31 12:53:05.681	0.0000	\N	\N	0.00	12005.82	18.0000	HEALTH	Care health	2026-05-01 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-01 00:00:00
158	OD Two Wheeler	ANNAMALAI	9940277344	2301208545410600000	2027-05-02 00:00:00	322.00	322.00	0.00	Leadership	\N	\N	\N	1	2026-05-31 12:53:05.685	2026-05-31 12:53:05.685	0.0000	\N	\N	0.00	57.96	18.0000	MOTOR	HDFC ERGO	2026-05-02 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-02 00:00:00
162	Health Assure	HARISH BABU SEKAR	7010400530	5987112700048507	2027-05-18 00:00:00	11693.00	11693.00	0.00	Aruna Devi	\N	\N	\N	1	2026-05-31 12:53:05.701	2026-05-31 12:53:05.701	0.0000	\N	\N	0.00	2104.74	18.0000	HEALTH	STAR Health	2026-05-18 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-18 00:00:00
163	Bharath Griha Raksha	BHUVANESHWARI	7550295448	UNKNOWN-165	2027-05-19 00:00:00	11326.00	11326.00	0.00	Syed	\N	\N	\N	1	2026-05-31 12:53:05.705	2026-05-31 12:53:05.705	0.0000	\N	\N	0.00	2038.68	18.0000	PROPERTY	New India Ins	2026-05-19 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-19 00:00:00
164	Trip Secure Plus	S A VAIRAPRAKASH	9842417171	4233/440992147/00/000	2027-05-19 00:00:00	3936.00	3936.00	0.00	Eashwar	\N	\N	\N	1	2026-05-31 12:53:05.709	2026-05-31 12:53:05.709	0.0000	\N	\N	0.00	708.48	18.0000	TRAVEL	ICICI Lombard	2026-05-19 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-19 00:00:00
165	Care Health	MK NITHIYANANDHAM	9600091044	B3255339	2027-05-22 00:00:00	44268.00	44268.00	0.00	Madhesh	\N	\N	\N	1	2026-05-31 12:53:05.713	2026-05-31 12:53:05.713	0.0000	\N	\N	0.00	7968.24	18.0000	HEALTH	Care health	2026-05-22 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-22 00:00:00
166	Trip Secure Plus	K ISHWARYA	9842417171	4233/441468027/00/000	2027-05-23 00:00:00	1061.00	1061.00	0.00	Eashwar	\N	\N	\N	1	2026-05-31 12:53:05.717	2026-05-31 12:53:05.717	0.0000	\N	\N	0.00	190.98	18.0000	TRAVEL	ICICI Lombard	2026-05-23 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-23 00:00:00
167	Women Care	SANGEERTHANA	7358756383	7439112700064167	2027-05-25 00:00:00	27165.00	27165.00	0.00	Leadership	\N	\N	\N	1	2026-05-31 12:53:05.721	2026-05-31 12:53:05.721	0.0000	\N	\N	0.00	4889.70	18.0000	HEALTH	STAR Health	2026-05-25 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-25 00:00:00
168	Trip Secure Single Trip	ELANGO P	9971494063	4233/443209062/00/00	2027-06-01 00:00:00	13250.00	0.00	0.00	Ranjith	ONLINE	\N	\N	1	2026-06-10 07:09:07.741	2026-06-10 07:09:07.741	35.0000	\N	ELANGO@GMAIL.COM	0.00	0.00	0.0000	TRAVEL	ICICI Lombard General	2026-06-01 00:00:00	YEARLY	\N	ACTIVE	0.00	0.0000	\N	\N	\N	\N	f	\N	2027-06-01 00:00:00
90	Digit Jewellers Secure	SUDAKAR	9444302807	D250918681	2027-02-05 00:00:00	34999.00	29660.00	8097.18	Mahalakshmi	\N	BG034	2026-03-11 00:00:00	1	2026-05-31 12:53:05.262	2026-06-11 06:41:47.434	27.3000	\N	\N	7287.46	5338.80	18.0000	PROPERTY	Go Digit General	2026-02-05 00:00:00	YEARLY	FRESH	ACTIVE	809.72	10.0000	\N	\N	\N	\N	f	\N	2027-02-05 00:00:00
124	Digit Two Wheeler	THARUN K	9738101437	D257237704	2027-03-20 00:00:00	901.00	901.00	464.02	Shalini D	\N	BG039	2026-04-15 00:00:00	1	2026-05-31 12:53:05.522	2026-06-11 06:41:47.434	51.5000	\N	\N	417.62	162.18	18.0000	MOTOR	Go Digit General	2026-03-20 00:00:00	YEARLY	FRESH	ACTIVE	46.40	10.0000	\N	\N	\N	\N	f	\N	2027-03-20 00:00:00
141	Employee Compensation	MATHA ENGINEERING	9894048330	D260162035	2027-04-04 00:00:00	2530.00	2530.00	0.00	Manikandan	\N	BG047	2026-05-12 00:00:00	1	2026-05-31 12:53:05.609	2026-06-11 06:41:47.434	0.0000	\N	\N	0.00	455.40	18.0000	GENERAL	Go Digit General	2026-04-04 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-04-04 00:00:00
161	Digit WMC Workman	GOPALAN SELVAKUMAR	5466	D266760817	2026-06-18 00:00:00	3035.00	3035.00	0.00	Manikandan	\N	\N	\N	1	2026-05-31 12:53:05.697	2026-06-11 06:41:47.434	0.0000	\N	\N	0.00	546.30	18.0000	GENERAL	Go Digit General	2026-05-18 00:00:00	MONTHLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2026-06-18 00:00:00
160	Digit Icon	PANDIYAN S	9944299406	L020376289	2027-05-11 00:00:00	34615.00	34615.00	0.00	Pandiyan	\N	\N	\N	1	2026-05-31 12:53:05.693	2026-06-11 06:41:47.446	0.0000	\N	\N	0.00	6230.70	18.0000	LIFE	Go Digit Life	2026-05-11 00:00:00	YEARLY	FRESH	ACTIVE	0.00	10.0000	\N	\N	\N	\N	f	\N	2027-05-11 00:00:00
\.


--
-- Data for Name: posp_commission_overrides; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posp_commission_overrides (id, "pospMemberId", "policyId", "commissionRate", "brokerageAmount", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: posp_incentive_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posp_incentive_entries (id, "pospMemberId", "policyId", "isManual", "entryDate", "policyNumber", "customerName", "policyType", premium, "commissionRate", "pospShare", brokerage, "pospCommission", "orgCommission", "paymentStatus", "invoiceReference", "invoiceDate", remarks, "createdById", "createdAt", "updatedAt", "isDeleted", "deletedAt", "isImported", "pospBillDate", "pospBillFilePath", "pospBillNo") FROM stdin;
2	1	\N	t	2025-09-10 00:00:00	1708003125P109281287	P.Balakrishnan	Vehicle Insurance	27082.00	0.00	65.00	1146.95	745.52	401.43	PAID	\N	\N	\N	1	2026-06-18 07:55:54.384	2026-06-18 07:55:54.384	f	\N	t	\N	\N	\N
3	1	\N	t	2025-10-05 00:00:00	4038/411057967/00/000	ROTARY DISTRICT 3234	EVENT MANAGEMENT	34221.00	0.00	65.00	3625.00	2356.25	1268.75	PAID	\N	\N	\N	1	2026-06-18 07:55:54.385	2026-06-18 07:55:54.385	f	\N	t	\N	\N	\N
6	1	\N	t	2025-12-22 00:00:00	1708003125P114811380	SARAVANAN B	FULL PACKAGE-CHEVROLET TAVERA	10721.00	0.00	65.00	1608.00	1045.20	562.80	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.392	2026-06-18 07:55:54.392	f	\N	t	\N	\N	\N
8	2	\N	t	2025-10-23 00:00:00	20902962	LOGANATHAN J	Health	26248.00	0.00	55.00	5960.00	3278.00	2086.00	PAID	\N	\N	\N	1	2026-06-18 07:55:54.397	2026-06-18 07:55:54.397	f	\N	t	\N	\N	\N
15	5	\N	t	2026-01-12 00:00:00	1708003125P115936154	SELVARAJ	PVT CAR/TP	3466.00	0.00	65.00	0.00	0.00	0.00	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.415	2026-06-18 07:55:54.415	f	\N	t	\N	\N	\N
25	9	\N	t	2025-12-17 00:00:00	4233/421405302/00/000	GURUMURTHY GOMPALAHALLY	Travel	1116.00	25.42	52.00	283.72	147.53	136.19	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.44	2026-06-18 07:55:54.44	f	\N	t	\N	\N	\N
26	9	\N	t	2025-12-17 00:00:00	4233/421406235/00/000	MINAL DAYANAND PRABHU	Travel	1116.00	25.42	52.00	283.72	147.53	136.19	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.441	2026-06-18 07:55:54.441	f	\N	t	\N	\N	\N
27	9	\N	t	2025-12-17 00:00:00	4233/421119396/00/000	JAYARAM KIKKERI SURYANARAYANA	Travel	792.00	25.42	52.00	201.41	104.73	96.68	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.443	2026-06-18 07:55:54.443	f	\N	t	\N	\N	\N
28	9	\N	t	2025-12-17 00:00:00	4233/421395465/00/000	SRINIDHI MATHUR	Travel	771.00	25.42	52.00	196.04	101.94	94.10	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.445	2026-06-18 07:55:54.445	f	\N	t	\N	\N	\N
29	9	\N	t	2025-12-17 00:00:00	4233/421398016/00/000	BALASUBRAMANIYAM	Travel	792.00	25.42	52.00	201.41	104.73	96.68	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.446	2026-06-18 07:55:54.446	f	\N	t	\N	\N	\N
30	9	\N	t	2025-12-17 00:00:00	4233/421399094/00/000	GAYATHRI SRIRAM	Travel	792.00	25.42	52.00	201.41	104.73	96.68	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.448	2026-06-18 07:55:54.448	f	\N	t	\N	\N	\N
31	9	\N	t	2025-12-31 00:00:00	4233/423237310/00/000	SUVIN PRASAD MANI	Travel	516.00	25.42	52.00	131.22	68.23	62.99	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.449	2026-06-18 07:55:54.449	f	\N	t	\N	\N	\N
34	11	\N	t	2026-03-03 00:00:00	1708003125P118755191	PRIYA T	TP	989.00	5.00	52.00	49.45	25.71	23.74	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.458	2026-06-18 07:55:54.458	f	\N	t	\N	\N	\N
35	11	\N	t	2026-04-04 00:00:00	D260162035	MATHA ENGINEERING	EMPLOYEE COMPENSATION	2530.00	27.54	52.00	696.72	362.29	334.43	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.46	2026-06-18 07:55:54.46	f	\N	t	\N	\N	\N
36	11	\N	t	2026-04-30 00:00:00	1708003126P101630107	SANTHOSH KUMAR K	PACKAGE POLICY	7746.00	16.95	52.00	1312.80	682.66	630.14	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.461	2026-06-18 07:55:54.461	f	\N	t	\N	\N	\N
1	1	\N	t	2025-09-10 00:00:00	1708003125P109242990	Raghavendra Ramakrishnan	Vehicle Insurance	6446.00	0.00	65.00	2845.00	1849.25	995.75	PAID	\N	\N	\N	1	2026-06-18 07:55:54.38	2026-06-19 09:08:01.596	f	\N	t	\N	\N	\N
5	1	\N	t	2025-11-21 00:00:00	4172/417729912/00/000	NAVEEN SENGUTTUVAN	FAMILY SHEILD(PA)	858.00	12.00	65.00	103.00	66.95	36.05	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.39	2026-06-19 07:18:47.888	f	\N	t	\N	\N	\N
21	7	\N	t	2026-04-07 00:00:00	1708003126P100491700	BHASKARAN	EV MOTOR-COMPREHENSIVE	54263.00	0.00	65.00	12578.80	8176.22	4402.58	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.429	2026-06-19 07:18:47.867	f	\N	t	\N	\N	\N
4	1	\N	t	2025-11-21 00:00:00	100029591300	NAVEEN SENGUTTUVAN	ELEVATE	8073.00	12.00	65.00	1026.00	666.90	359.10	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.387	2026-06-19 07:18:47.884	f	\N	t	\N	\N	\N
7	2	\N	t	2025-10-22 00:00:00	20903827	SUDHANYA LOGANATHAN	Health	18310.00	25.00	55.00	4158.00	2286.90	1455.30	PAID	\N	\N	\N	1	2026-06-18 07:55:54.396	2026-06-19 07:18:47.892	f	\N	t	\N	\N	\N
9	3	\N	t	2025-12-03 00:00:00	1708003125P113916260	SRIDEVI CHANDRASEKAR	OD+TP	6983.00	15.00	52.00	1099.00	571.48	527.52	PAID	\N	\N	\N	1	2026-06-18 07:55:54.401	2026-06-19 07:18:47.897	f	\N	t	\N	\N	\N
10	3	\N	t	2025-12-17 00:00:00	190000029440674	ELIZABETH	CHOLA FLEXI SUPER TOPUP-GOLD	12847.00	45.00	52.00	5781.00	3006.12	2774.88	PAID	\N	\N	\N	1	2026-06-18 07:55:54.403	2026-06-19 07:18:47.901	f	\N	t	\N	\N	\N
11	3	\N	t	2026-01-03 00:00:00	1708003125P115430293	MADHESHWARAN	PVT CAR (FULL COVER)	11574.00	5.00	52.00	578.00	300.56	277.44	PAID	\N	\N	\N	1	2026-06-18 07:55:54.404	2026-06-19 07:18:47.905	f	\N	t	\N	\N	\N
12	3	\N	t	2026-02-14 00:00:00	1708001125P117764236	KALKI IRON &STEEL TRADERS	UBSUS POLICY	14586.00	17.00	52.00	2498.00	1298.96	1199.04	PAID	\N	\N	\N	1	2026-06-18 07:55:54.406	2026-06-19 07:18:47.909	f	\N	t	\N	\N	\N
13	3	\N	t	2026-02-23 00:00:00	1708003125P118125463	VIJAY	OD+TP	13797.00	15.00	52.00	2069.00	1075.88	993.12	PAID	\N	\N	\N	1	2026-06-18 07:55:54.407	2026-06-19 07:18:47.914	f	\N	t	\N	\N	\N
14	4	\N	t	2026-01-07 00:00:00	2800000017246600000	SITHUKKANNAN	OPTIMA SECURE	86176.00	24.00	60.00	6975.00	4185.00	2441.25	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.411	2026-06-19 07:18:47.918	f	\N	t	\N	\N	\N
16	6	\N	t	2026-02-04 00:00:00	1708003125P117171243	AFROSE	MOTOR	7947.00	21.00	55.00	1644.23	904.33	739.91	PAID	\N	\N	\N	1	2026-06-18 07:55:54.419	2026-06-19 07:18:47.921	f	\N	t	\N	\N	\N
17	6	\N	t	2026-02-05 00:00:00	D250918681	SUDAKAR	SHOP INSURANCE	29660.00	27.00	55.00	8098.00	4453.90	3644.10	PAID	\N	\N	\N	1	2026-06-18 07:55:54.42	2026-06-19 07:18:47.925	f	\N	t	\N	\N	\N
20	7	\N	t	2026-03-03 00:00:00	K9042973	UMA	LIFETIME CLASSIC	50000.00	12.00	65.00	6000.00	3900.00	2100.00	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.427	2026-06-19 07:19:11.162	f	\N	t	\N	\N	\N
22	8	\N	t	2026-03-09 00:00:00	3839112600059339	SIVAKUMAR PERIYASAMY	SIVAKUMAR PERIYASAMY	23548.00	30.00	55.00	6984.28	3841.35	3142.93	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.433	2026-06-19 07:18:47.937	f	\N	t	\N	\N	\N
23	8	\N	t	2026-02-19 00:00:00	6862112600092246	SIVA MURTHY	SIVA MURTHY	18460.00	30.00	55.00	5475.42	3011.48	2463.94	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.434	2026-06-19 07:18:47.941	f	\N	t	\N	\N	\N
24	8	\N	t	2026-04-06 00:00:00	C295450326	SIVAMURTHY	Term & Rider	46974.00	67.00	55.00	31472.00	17309.60	14162.40	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.436	2026-06-19 07:18:47.944	f	\N	t	\N	\N	\N
32	10	\N	t	2026-01-12 00:00:00	1708003125P115936154	SELVARAJ	PVT CAR/TP	3466.00	5.00	52.00	173.30	90.12	83.18	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.453	2026-06-19 07:18:47.949	f	\N	t	\N	\N	\N
33	10	\N	t	2026-03-17 00:00:00	1708003125P119601974	ALAGAPPAN R	MOTOR-PACKAGE	370.00	5.00	52.00	18.50	9.62	8.88	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.454	2026-06-19 07:18:47.953	f	\N	t	\N	\N	\N
37	12	\N	t	2026-03-28 00:00:00	100053843300	RITHIKA MOHAN	Health	6979.00	28.00	52.00	1960.81	1019.62	941.19	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.464	2026-06-19 07:18:47.956	f	\N	t	\N	\N	\N
38	13	\N	t	2026-03-10 00:00:00	1708003125P118701987	PURAVALAN FRIGHT	TP+PA	16149.00	58.00	52.00	9285.68	4828.55	4457.13	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.468	2026-06-19 07:18:47.959	f	\N	t	\N	\N	\N
19	7	\N	t	2026-02-28 00:00:00	K8993183	BHASKARAN RAMASAMY	LIFE TIME CLASSIC	100000.00	12.00	65.00	12000.00	7800.00	4200.00	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.426	2026-06-19 07:19:11.148	f	\N	t	\N	\N	\N
18	7	\N	t	2025-07-11 00:00:00	3001/399980049/00/B00	R BHASKARAN RAMASAMY	Car Insurance	25109.00	0.00	65.00	0.00	0.00	0.00	PENDING	\N	\N	\N	1	2026-06-18 07:55:54.424	2026-06-19 08:42:24.262	f	\N	t	\N	bill_18_1781853988354.pdf	\N
\.


--
-- Data for Name: posp_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posp_members (id, name, code, mobile, email, "joiningDate", status, remarks, "isDeleted", "deletedAt", "createdById", "createdAt", "updatedAt") FROM stdin;
1	Mr.Ranganathan	MRRA	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.316	2026-06-18 07:55:54.316
2	Sugitha	SUGI	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.332	2026-06-18 07:55:54.332
3	Madhesh	MADH	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.336	2026-06-18 07:55:54.336
4	Ramaraj	RAMA	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.34	2026-06-18 07:55:54.34
5	Siva Ponamaravati	SIVA	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.343	2026-06-18 07:55:54.343
6	Mahalakshmi	MAHA	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.347	2026-06-18 07:55:54.347
7	Bhaskar	BHAS	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.351	2026-06-18 07:55:54.351
8	Shivamurthy, Singapore	SHIV	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.355	2026-06-18 07:55:54.355
9	Eshwaramurthy, Singapore	ESHW	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.358	2026-06-18 07:55:54.358
10	Siva, Pon Amaravati	SIVA01	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.363	2026-06-18 07:55:54.363
11	Manikandan Saravanan	MANI	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.366	2026-06-18 07:55:54.366
12	Manimekalai Sasikumar	MANI01	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.371	2026-06-18 07:55:54.371
13	Mahalakshmi Bill No.2	MAHA01	\N	\N	\N	ACTIVE	\N	f	\N	1	2026-06-18 07:55:54.376	2026-06-18 07:55:54.376
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, "insurerId", active, "createdAt", "updatedAt", "insuranceCategory") FROM stdin;
72	Car Insurance	27	t	2026-06-03 05:49:14.733	2026-06-03 05:49:14.733	\N
73	OD+TP	27	t	2026-06-03 05:49:14.743	2026-06-03 05:49:14.743	\N
74	OD+PA+TP	27	t	2026-06-03 05:49:14.749	2026-06-03 05:49:14.749	\N
75	Two Wheeler	27	t	2026-06-03 05:49:14.755	2026-06-03 05:49:14.755	\N
76	Elevate	27	t	2026-06-03 05:49:14.762	2026-06-03 05:49:14.762	\N
77	Elevate Port	27	t	2026-06-03 05:49:14.767	2026-06-03 05:49:14.767	\N
78	Activate Booster	27	t	2026-06-03 05:49:14.773	2026-06-03 05:49:14.773	\N
79	Activate Booster Topup	27	t	2026-06-03 05:49:14.779	2026-06-03 05:49:14.779	\N
80	OPD Secure 5K	27	t	2026-06-03 05:49:14.783	2026-06-03 05:49:14.783	\N
81	Family Shield PA	27	t	2026-06-03 05:49:14.787	2026-06-03 05:49:14.787	\N
82	Risk Policy	27	t	2026-06-03 05:49:14.793	2026-06-03 05:49:14.793	\N
83	Trip Secure Plus	27	t	2026-06-03 05:49:14.797	2026-06-03 05:49:14.797	\N
84	Trip Secure Single Trip	27	t	2026-06-03 05:49:14.801	2026-06-03 05:49:14.801	\N
85	Event Insurance Policy	27	t	2026-06-03 05:49:14.808	2026-06-03 05:49:14.808	\N
86	Term Insurance	26	t	2026-06-03 05:49:14.817	2026-06-03 05:49:14.817	\N
87	I Protect Smart Plus	26	t	2026-06-03 05:49:14.823	2026-06-03 05:49:14.823	\N
88	Life Time Classic	26	t	2026-06-03 05:49:14.829	2026-06-03 05:49:14.829	\N
89	Health Assure	37	t	2026-06-03 05:49:14.84	2026-06-03 05:49:14.84	\N
90	Star Health Assure	37	t	2026-06-03 05:49:14.845	2026-06-03 05:49:14.845	\N
91	Star Assure	37	t	2026-06-03 05:49:14.849	2026-06-03 05:49:14.849	\N
92	Star Comprehensive Plan	37	t	2026-06-03 05:49:14.854	2026-06-03 05:49:14.854	\N
93	Super Star	37	t	2026-06-03 05:49:14.86	2026-06-03 05:49:14.86	\N
94	Super Star Preferred	37	t	2026-06-03 05:49:14.865	2026-06-03 05:49:14.865	\N
95	Super Surplus Topup	37	t	2026-06-03 05:49:14.869	2026-06-03 05:49:14.869	\N
96	Women Care	37	t	2026-06-03 05:49:14.876	2026-06-03 05:49:14.876	\N
97	Women Care Policy	37	t	2026-06-03 05:49:14.881	2026-06-03 05:49:14.881	\N
98	Comprehensive	37	t	2026-06-03 05:49:14.885	2026-06-03 05:49:14.885	\N
99	Health Insurance	29	t	2026-06-03 05:49:14.898	2026-06-03 05:49:14.898	\N
100	Optima Secure	29	t	2026-06-03 05:49:14.902	2026-06-03 05:49:14.902	\N
101	Optima Secure Super Secure	29	t	2026-06-03 05:49:14.908	2026-06-03 05:49:14.908	\N
102	Koti Suraksha	29	t	2026-06-03 05:49:14.913	2026-06-03 05:49:14.913	\N
103	Health Koti Suraksha	29	t	2026-06-03 05:49:14.917	2026-06-03 05:49:14.917	\N
104	Health Koti Suraksha Risk	29	t	2026-06-03 05:49:14.922	2026-06-03 05:49:14.922	\N
105	Comprehensive	29	t	2026-06-03 05:49:14.928	2026-06-03 05:49:14.928	\N
106	OD Two Wheeler	29	t	2026-06-03 05:49:14.932	2026-06-03 05:49:14.932	\N
107	New Vehicle Comprehensive	29	t	2026-06-03 05:49:14.936	2026-06-03 05:49:14.936	\N
108	Health Assure	29	t	2026-06-03 05:49:14.943	2026-06-03 05:49:14.943	\N
109	Care Heart	38	t	2026-06-03 05:49:14.952	2026-06-03 05:49:14.952	\N
110	Care Supreme	38	t	2026-06-03 05:49:14.958	2026-06-03 05:49:14.958	\N
111	Care Health	38	t	2026-06-03 05:49:14.962	2026-06-03 05:49:14.962	\N
112	Vehicle Insurance	35	t	2026-06-03 05:49:14.973	2026-06-03 05:49:14.973	\N
113	Motor TP	35	t	2026-06-03 05:49:14.978	2026-06-03 05:49:14.978	\N
114	PVT CAR TP	35	t	2026-06-03 05:49:14.982	2026-06-03 05:49:14.982	\N
115	TP+PA	35	t	2026-06-03 05:49:14.987	2026-06-03 05:49:14.987	\N
116	Full Package	35	t	2026-06-03 05:49:14.992	2026-06-03 05:49:14.992	\N
117	Full Package Fascino BSIV	35	t	2026-06-03 05:49:14.996	2026-06-03 05:49:14.996	\N
118	Full Package Splender	35	t	2026-06-03 05:49:15	2026-06-03 05:49:15	\N
119	Full Package Chevrolet Tavera	35	t	2026-06-03 05:49:15.003	2026-06-03 05:49:15.003	\N
120	PVT CAR Full Cover	35	t	2026-06-03 05:49:15.008	2026-06-03 05:49:15.008	\N
121	PVT CAR Full Pack	35	t	2026-06-03 05:49:15.012	2026-06-03 05:49:15.012	\N
122	EV Motor Comprehensive	35	t	2026-06-03 05:49:15.016	2026-06-03 05:49:15.016	\N
123	Two Wheeler	35	t	2026-06-03 05:49:15.019	2026-06-03 05:49:15.019	\N
124	TP Two Wheeler	35	t	2026-06-03 05:49:15.025	2026-06-03 05:49:15.025	\N
125	TP	35	t	2026-06-03 05:49:15.029	2026-06-03 05:49:15.029	\N
126	OD	35	t	2026-06-03 05:49:15.033	2026-06-03 05:49:15.033	\N
127	Motor Package	35	t	2026-06-03 05:49:15.037	2026-06-03 05:49:15.037	\N
128	Package Policy	35	t	2026-06-03 05:49:15.042	2026-06-03 05:49:15.042	\N
129	OD+TP	35	t	2026-06-03 05:49:15.046	2026-06-03 05:49:15.046	\N
130	COMM TP+PA	35	t	2026-06-03 05:49:15.05	2026-06-03 05:49:15.05	\N
131	Warehouse Insurance	35	t	2026-06-03 05:49:15.053	2026-06-03 05:49:15.053	\N
132	UBSUS Policy	35	t	2026-06-03 05:49:15.059	2026-06-03 05:49:15.059	\N
133	Professional Indemnity	36	t	2026-06-03 05:49:15.066	2026-06-03 05:49:15.066	\N
134	Bharath Griha Raksha	36	t	2026-06-03 05:49:15.071	2026-06-03 05:49:15.071	\N
135	Chola Flexi Super Topup Gold	28	t	2026-06-03 05:49:15.08	2026-06-03 05:49:15.08	\N
136	Sampoorna Raksha	30	t	2026-06-03 05:49:15.09	2026-06-03 05:49:15.09	\N
137	Digit Two Wheeler	32	t	2026-06-03 05:49:15.099	2026-06-03 05:49:15.099	\N
138	Digit Jewellers Secure	32	t	2026-06-03 05:49:15.102	2026-06-03 05:49:15.102	\N
139	Employee Compensation	32	t	2026-06-03 05:49:15.108	2026-06-03 05:49:15.108	\N
140	Digit WMC Workman	32	t	2026-06-03 05:49:15.112	2026-06-03 05:49:15.112	\N
141	Digit Icon	31	t	2026-06-03 05:49:15.119	2026-06-03 05:49:15.119	\N
\.


--
-- Data for Name: statement_policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.statement_policies (id, "statementId", "policyId", "taxableValue", "createdAt") FROM stdin;
1	2	139	9970.20	2026-06-09 07:13:16.713
2	4	63	10000.00	2026-06-10 03:38:43.448
3	5	159	0.00	2026-06-10 04:00:45.213
4	6	156	0.00	2026-06-10 04:03:47.844
5	7	130	10000.00	2026-06-10 04:06:52.44
6	8	157	0.00	2026-06-10 07:52:23.045
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, role, "createdAt", "updatedAt") FROM stdin;
1	Admin	admin@bigin.com	$2b$12$F76UIVeYmyfNaJxs2kKWQu2Gx/zaQVpEF7B4rcENsJQloxg0KvpTK	ADMIN	2026-05-31 11:56:36.312	2026-05-31 11:56:36.312
2	Owner	owner@bigin.com	$2b$12$041sOAZj17MtirF0.M3A1eleAw5ZnEbixNJ3FOPHz.5LvPiTnE4By	OWNER	2026-05-31 11:57:48.771	2026-05-31 11:57:48.771
\.


--
-- Name: incentive_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.incentive_entries_id_seq', 25, true);


--
-- Name: incentive_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.incentive_settings_id_seq', 1, false);


--
-- Name: incentives_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.incentives_id_seq', 40, true);


--
-- Name: insurer_invoice_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.insurer_invoice_profiles_id_seq', 6, true);


--
-- Name: insurer_statements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.insurer_statements_id_seq', 8, true);


--
-- Name: insurers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.insurers_id_seq', 40, true);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoices_id_seq', 13, true);


--
-- Name: lead_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_members_id_seq', 67, true);


--
-- Name: policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.policies_id_seq', 180, true);


--
-- Name: posp_commission_overrides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posp_commission_overrides_id_seq', 1, false);


--
-- Name: posp_incentive_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posp_incentive_entries_id_seq', 38, true);


--
-- Name: posp_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posp_members_id_seq', 13, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 141, true);


--
-- Name: statement_policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.statement_policies_id_seq', 6, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: incentive_entries incentive_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentive_entries
    ADD CONSTRAINT incentive_entries_pkey PRIMARY KEY (id);


--
-- Name: incentive_settings incentive_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentive_settings
    ADD CONSTRAINT incentive_settings_pkey PRIMARY KEY (id);


--
-- Name: incentives incentives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentives
    ADD CONSTRAINT incentives_pkey PRIMARY KEY (id);


--
-- Name: insurer_invoice_profiles insurer_invoice_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurer_invoice_profiles
    ADD CONSTRAINT insurer_invoice_profiles_pkey PRIMARY KEY (id);


--
-- Name: insurer_statements insurer_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurer_statements
    ADD CONSTRAINT insurer_statements_pkey PRIMARY KEY (id);


--
-- Name: insurers insurers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurers
    ADD CONSTRAINT insurers_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: lead_members lead_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_members
    ADD CONSTRAINT lead_members_pkey PRIMARY KEY (id);


--
-- Name: policies policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_pkey PRIMARY KEY (id);


--
-- Name: posp_commission_overrides posp_commission_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_commission_overrides
    ADD CONSTRAINT posp_commission_overrides_pkey PRIMARY KEY (id);


--
-- Name: posp_incentive_entries posp_incentive_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_incentive_entries
    ADD CONSTRAINT posp_incentive_entries_pkey PRIMARY KEY (id);


--
-- Name: posp_members posp_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_members
    ADD CONSTRAINT posp_members_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: statement_policies statement_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_policies
    ADD CONSTRAINT statement_policies_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: incentive_entries_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX incentive_entries_date_idx ON public.incentive_entries USING btree (date);


--
-- Name: incentive_entries_employeeId_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "incentive_entries_employeeId_date_idx" ON public.incentive_entries USING btree ("employeeId", date);


--
-- Name: incentives_leadMemberId_month_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "incentives_leadMemberId_month_key" ON public.incentives USING btree ("leadMemberId", month);


--
-- Name: insurer_invoice_profiles_insurerId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "insurer_invoice_profiles_insurerId_key" ON public.insurer_invoice_profiles USING btree ("insurerId");


--
-- Name: insurer_statements_insurerId_statementDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "insurer_statements_insurerId_statementDate_idx" ON public.insurer_statements USING btree ("insurerId", "statementDate");


--
-- Name: insurer_statements_insurerId_statementRefNo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "insurer_statements_insurerId_statementRefNo_key" ON public.insurer_statements USING btree ("insurerId", "statementRefNo");


--
-- Name: insurer_statements_invoiceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "insurer_statements_invoiceId_key" ON public.insurer_statements USING btree ("invoiceId");


--
-- Name: insurer_statements_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX insurer_statements_status_idx ON public.insurer_statements USING btree (status);


--
-- Name: insurers_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX insurers_name_key ON public.insurers USING btree (name);


--
-- Name: invoices_insurerId_billingMonth_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "invoices_insurerId_billingMonth_idx" ON public.invoices USING btree ("insurerId", "billingMonth");


--
-- Name: invoices_invoiceNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON public.invoices USING btree ("invoiceNumber");


--
-- Name: lead_members_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lead_members_name_key ON public.lead_members USING btree (name);


--
-- Name: policies_policyNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "policies_policyNumber_key" ON public.policies USING btree ("policyNumber");


--
-- Name: posp_commission_overrides_pospMemberId_policyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "posp_commission_overrides_pospMemberId_policyId_key" ON public.posp_commission_overrides USING btree ("pospMemberId", "policyId");


--
-- Name: posp_incentive_entries_entryDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "posp_incentive_entries_entryDate_idx" ON public.posp_incentive_entries USING btree ("entryDate");


--
-- Name: posp_incentive_entries_pospMemberId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "posp_incentive_entries_pospMemberId_idx" ON public.posp_incentive_entries USING btree ("pospMemberId");


--
-- Name: posp_members_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX posp_members_code_key ON public.posp_members USING btree (code);


--
-- Name: products_insurerId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "products_insurerId_name_key" ON public.products USING btree ("insurerId", name);


--
-- Name: statement_policies_policyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "statement_policies_policyId_idx" ON public.statement_policies USING btree ("policyId");


--
-- Name: statement_policies_statementId_policyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "statement_policies_statementId_policyId_key" ON public.statement_policies USING btree ("statementId", "policyId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: incentive_entries incentive_entries_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentive_entries
    ADD CONSTRAINT "incentive_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incentive_entries incentive_entries_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentive_entries
    ADD CONSTRAINT "incentive_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.lead_members(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incentives incentives_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentives
    ADD CONSTRAINT "incentives_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incentives incentives_deletedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentives
    ADD CONSTRAINT "incentives_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incentives incentives_leadMemberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incentives
    ADD CONSTRAINT "incentives_leadMemberId_fkey" FOREIGN KEY ("leadMemberId") REFERENCES public.lead_members(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: insurer_invoice_profiles insurer_invoice_profiles_insurerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurer_invoice_profiles
    ADD CONSTRAINT "insurer_invoice_profiles_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES public.insurers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: insurer_statements insurer_statements_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurer_statements
    ADD CONSTRAINT "insurer_statements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: insurer_statements insurer_statements_insurerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurer_statements
    ADD CONSTRAINT "insurer_statements_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES public.insurers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: insurer_statements insurer_statements_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurer_statements
    ADD CONSTRAINT "insurer_statements_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_cancelledById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_insurerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES public.insurers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: policies policies_cancelledById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT "policies_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: policies policies_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT "policies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: posp_commission_overrides posp_commission_overrides_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_commission_overrides
    ADD CONSTRAINT "posp_commission_overrides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: posp_commission_overrides posp_commission_overrides_pospMemberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_commission_overrides
    ADD CONSTRAINT "posp_commission_overrides_pospMemberId_fkey" FOREIGN KEY ("pospMemberId") REFERENCES public.posp_members(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: posp_incentive_entries posp_incentive_entries_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_incentive_entries
    ADD CONSTRAINT "posp_incentive_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: posp_incentive_entries posp_incentive_entries_pospMemberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_incentive_entries
    ADD CONSTRAINT "posp_incentive_entries_pospMemberId_fkey" FOREIGN KEY ("pospMemberId") REFERENCES public.posp_members(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: posp_members posp_members_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posp_members
    ADD CONSTRAINT "posp_members_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: products products_insurerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "products_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES public.insurers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: statement_policies statement_policies_policyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_policies
    ADD CONSTRAINT "statement_policies_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES public.policies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: statement_policies statement_policies_statementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statement_policies
    ADD CONSTRAINT "statement_policies_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES public.insurer_statements(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict okXxKYmFdimmabwvCuOD2nZDdmv6oVFGOSvd2QDfNu2zzWSx103szAthzl9kL2U

