{{/* vim: set filetype=mustache: */}}

{{/*
Expand the name of the chart.
*/}}
{{- define "transcrobes.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "transcrobes.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create unified labels for transcrobes components
*/}}
{{- define "transcrobes.common.matchLabels" -}}
app: {{ template "transcrobes.name" . }}
release: {{ .Release.Name }}
{{- end -}}

{{- define "transcrobes.common.metaLabels" -}}
chart: {{ .Chart.Name }}-{{ .Chart.Version }}
heritage: {{ .Release.Service }}
{{- end -}}

{{- define "transcrobes.corenlpEn.labels" -}}
{{ include "transcrobes.corenlpEn.matchLabels" . }}
{{ include "transcrobes.common.metaLabels" . }}
{{- end -}}

{{- define "transcrobes.corenlpEn.matchLabels" -}}
component: {{ .Values.corenlpEn.name | quote }}
{{ include "transcrobes.common.matchLabels" . }}
{{- end -}}

{{- define "transcrobes.downloads.labels" -}}
{{ include "transcrobes.downloads.matchLabels" . }}
{{ include "transcrobes.common.metaLabels" . }}
{{- end -}}

{{- define "transcrobes.downloads.matchLabels" -}}
component: {{ .Values.downloads.name | quote }}
{{ include "transcrobes.common.matchLabels" . }}
{{- end -}}

{{- define "transcrobes.corenlpZh.labels" -}}
{{ include "transcrobes.corenlpZh.matchLabels" . }}
{{ include "transcrobes.common.metaLabels" . }}
{{- end -}}

{{- define "transcrobes.corenlpZh.matchLabels" -}}
component: {{ .Values.corenlpZh.name | quote }}
{{ include "transcrobes.common.matchLabels" . }}
{{- end -}}

{{- define "transcrobes.transcrobes.labels" -}}
{{ include "transcrobes.transcrobes.matchLabels" . }}
{{ include "transcrobes.common.metaLabels" . }}
{{- end -}}

{{- define "transcrobes.transcrobes.matchLabels" -}}
component: {{ .Values.transcrobes.name | quote }}
{{ include "transcrobes.common.matchLabels" . }}
{{- end -}}

{{/*
Return the proper image names
*/}}
{{- define "transcrobes.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.transcrobes.image "global" .Values.global) }}
{{- end -}}
{{- define "transcrobes.imagePullSecrets" -}}
{{ include "common.images.pullSecrets" (dict "images" (list .Values.transcrobes.image .Values.transcrobes.volumePermissions.image) "global" .Values.global) }}
{{- end -}}

{{- define "backups.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.transcrobes.backups.image "global" .Values.global) }}
{{- end -}}
{{- define "backups.imagePullSecrets" -}}
{{ include "common.images.pullSecrets" (dict "images" (list .Values.transcrobes.backups.image .Values.transcrobes.backups.volumePermissions.image) "global" .Values.global) }}
{{- end -}}

{{- define "downloads.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.downloads.image "global" .Values.global) }}
{{- end -}}
{{- define "downloads.imagePullSecrets" -}}
{{ include "common.images.pullSecrets" (dict "images" (list .Values.downloads.image .Values.downloads.volumePermissions.image) "global" .Values.global) }}
{{- end -}}

{{- define "corenlpZh.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.corenlpZh.image "global" .Values.global) }}
{{- end -}}
{{- define "corenlpEn.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.corenlpEn.image "global" .Values.global) }}
{{- end -}}

{{/*
Common labels sworker
*/}}
{{- define "transcrobes.sworker.labels" -}}
helm.sh/chart: {{ include "transcrobes.name" . }}
{{ include "transcrobes.sworker.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels sworker
*/}}
{{- define "transcrobes.sworker.selectorLabels" -}}
app.kubernetes.io/name: {{ include "transcrobes.name" . }}-sworker
app.kubernetes.io/instance: {{ .Release.Name }}-sworker
{{- end }}

{{- define "transcrobes.sworker.matchLabels" -}}
component: {{ .Values.sworker.name | quote }}
{{ include "transcrobes.common.matchLabels" . }}
{{- end -}}

{{/*
Common labels faustworker
*/}}
{{- define "transcrobes.faustworker.labels" -}}
helm.sh/chart: {{ include "transcrobes.name" . }}
{{ include "transcrobes.faustworker.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels faustworker
*/}}
{{- define "transcrobes.faustworker.selectorLabels" -}}
app.kubernetes.io/name: {{ include "transcrobes.name" . }}-faustworker
app.kubernetes.io/instance: {{ .Release.Name }}-faustworker
{{- end }}

{{- define "transcrobes.faustworker.matchLabels" -}}
component: {{ .Values.faustworker.name | quote }}
{{ include "transcrobes.common.matchLabels" . }}
{{- end -}}

{{- define "transcrobes.corenlpEn.fullname" -}}
{{- if .Values.corenlpEn.fullnameOverride -}}
{{- .Values.corenlpEn.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- printf "%s-%s" .Release.Name .Values.corenlpEn.name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s-%s" .Release.Name $name .Values.corenlpEn.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "transcrobes.corenlpZh.fullname" -}}
{{- if .Values.corenlpZh.fullnameOverride -}}
{{- .Values.corenlpZh.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- printf "%s-%s" .Release.Name .Values.corenlpZh.name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s-%s" .Release.Name $name .Values.corenlpZh.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "transcrobes.downloads.fullname" -}}
{{- if .Values.downloads.fullnameOverride -}}
{{- .Values.downloads.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- printf "%s-%s" .Release.Name .Values.downloads.name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s-%s" .Release.Name $name .Values.downloads.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create a fully qualified transcrobes name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}

{{- define "transcrobes.transcrobes.fullname" -}}
{{- if .Values.transcrobes.fullnameOverride -}}
{{- .Values.transcrobes.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- printf "%s-%s" .Release.Name .Values.transcrobes.name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s-%s" .Release.Name $name .Values.transcrobes.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create the name of the service account to use for the transcrobes component
*/}}
{{- define "transcrobes.serviceAccountName.transcrobes" -}}
{{- if .Values.serviceAccounts.transcrobes.create -}}
    {{ default (include "transcrobes.transcrobes.fullname" .) .Values.serviceAccounts.transcrobes.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccounts.transcrobes.name }}
{{- end -}}
{{- end -}}

{{- define "transcrobes.sworker.fullname" -}}
{{- if .Values.sworker.fullnameOverride -}}
{{- .Values.sworker.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- printf "%s-%s" .Release.Name .Values.sworker.name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s-%s" .Release.Name $name .Values.sworker.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "transcrobes.faustworker.fullname" -}}
{{- if .Values.faustworker.fullnameOverride -}}
{{- .Values.faustworker.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- printf "%s-%s" .Release.Name .Values.faustworker.name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s-%s" .Release.Name $name .Values.faustworker.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create the name of the service account to use for the corenlpEn component
*/}}
{{- define "transcrobes.serviceAccountName.corenlpEn" -}}
{{- if .Values.serviceAccounts.corenlpEn.create -}}
    {{ default (include "transcrobes.corenlpEn.fullname" .) .Values.serviceAccounts.corenlpEn.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccounts.corenlpEn.name }}
{{- end -}}
{{- end -}}

{{/*
Create the name of the service account to use for the corenlpZh component
*/}}
{{- define "transcrobes.serviceAccountName.corenlpZh" -}}
{{- if .Values.serviceAccounts.corenlpZh.create -}}
    {{ default (include "transcrobes.corenlpZh.fullname" .) .Values.serviceAccounts.corenlpZh.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccounts.corenlpZh.name }}
{{- end -}}
{{- end -}}

{{/*
Create a fully qualified kafka name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}

{{- define "transcrobes.kafka.fullname" -}}
{{- if .Values.kafka.fullnameOverride -}}
{{- .Values.kafka.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.kafka.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- printf "%s-%s" .Release.Name .Values.kafka.name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s-%s" .Release.Name $name .Values.kafka.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Other helper functions
*/}}

{{- define "transcrobes.transcrobes.reallyFullname" -}}
{{- $fullname := include "transcrobes.transcrobes.fullname" . -}}
{{- printf "%s.%s.%s" $fullname .Release.Namespace "svc.cluster.local" -}}
{{- end -}}
