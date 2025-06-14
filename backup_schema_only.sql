--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

-- Started on 2025-06-14 03:01:34 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 65537)
-- Name: new_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.new_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    show_watermark boolean DEFAULT true
);


--
-- TOC entry 223 (class 1259 OID 442369)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL
);


--
-- TOC entry 222 (class 1259 OID 442368)
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3407 (class 0 OID 0)
-- Dependencies: 222
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- TOC entry 224 (class 1259 OID 1171456)
-- Name: photo_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.photo_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    photo_id text NOT NULL,
    client_name text NOT NULL,
    comment text NOT NULL,
    is_viewed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 221 (class 1259 OID 65551)
-- Name: photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    url text NOT NULL,
    selected boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    original_name text,
    filename text
);


--
-- TOC entry 216 (class 1259 OID 24577)
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    public_id text NOT NULL,
    name text NOT NULL,
    client_name text NOT NULL,
    client_email text NOT NULL,
    photographer_id integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    photos jsonb DEFAULT '[]'::jsonb,
    selected_photos jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    visual_watermark boolean DEFAULT false NOT NULL,
    apply_watermark boolean DEFAULT false NOT NULL,
    show_watermark boolean DEFAULT true
);


--
-- TOC entry 215 (class 1259 OID 24576)
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3408 (class 0 OID 0)
-- Dependencies: 215
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- TOC entry 219 (class 1259 OID 32768)
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- TOC entry 218 (class 1259 OID 24592)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'photographer'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    plan_type text DEFAULT 'free'::text,
    upload_limit integer DEFAULT 0,
    used_uploads integer DEFAULT 0,
    subscription_start_date timestamp without time zone,
    subscription_end_date timestamp without time zone,
    subscription_status text DEFAULT 'inactive'::text,
    stripe_customer_id text,
    stripe_subscription_id text,
    subscription_id text,
    last_event jsonb DEFAULT 'null'::jsonb,
    phone text NOT NULL,
    last_login_at timestamp without time zone,
    pending_downgrade_date timestamp without time zone,
    pending_downgrade_reason text,
    original_plan_before_downgrade text,
    manual_activation_date timestamp without time zone,
    manual_activation_by text,
    is_manual_activation boolean DEFAULT false
);


--
-- TOC entry 217 (class 1259 OID 24591)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3409 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3230 (class 2604 OID 442372)
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- TOC entry 3206 (class 2604 OID 24580)
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- TOC entry 3214 (class 2604 OID 24595)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3248 (class 2606 OID 65545)
-- Name: new_projects new_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.new_projects
    ADD CONSTRAINT new_projects_pkey PRIMARY KEY (id);


--
-- TOC entry 3252 (class 2606 OID 442377)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3254 (class 2606 OID 1171465)
-- Name: photo_comments photo_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photo_comments
    ADD CONSTRAINT photo_comments_pkey PRIMARY KEY (id);


--
-- TOC entry 3250 (class 2606 OID 65560)
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- TOC entry 3238 (class 2606 OID 24588)
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- TOC entry 3240 (class 2606 OID 24590)
-- Name: projects projects_public_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_public_id_unique UNIQUE (public_id);


--
-- TOC entry 3246 (class 2606 OID 32774)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- TOC entry 3242 (class 2606 OID 24609)
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- TOC entry 3244 (class 2606 OID 24607)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3256 (class 2606 OID 999425)
-- Name: new_projects new_projects_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.new_projects
    ADD CONSTRAINT new_projects_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3258 (class 2606 OID 999435)
-- Name: password_reset_tokens password_reset_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3257 (class 2606 OID 999430)
-- Name: photos photos_project_id_new_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_project_id_new_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.new_projects(id) ON DELETE CASCADE;


--
-- TOC entry 3255 (class 2606 OID 24610)
-- Name: projects projects_photographer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_photographer_id_users_id_fk FOREIGN KEY (photographer_id) REFERENCES public.users(id);


-- Completed on 2025-06-14 03:01:35 UTC

--
-- PostgreSQL database dump complete
--

